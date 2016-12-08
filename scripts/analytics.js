/**
 * Copyright 2016 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* global ga, PAIN, performance */

window.PAIN = window.PAIN || {}

PAIN.Analytics = PAIN.Analytics ||
  (function (exports) {
    'use strict'

    /**
     * Analytics for the Settle Up: Web App.
     * @constructor
     */
    class Analytics {

      constructor () {
        this.setTrackerDefaults()
        this.initTrackerReadyState()

        // Tracks the initial pageview.
        this.trackPageView()

        // Tracks perf events that were marked in the template code. Changes here
        // must also be made in `layout_full.html`.
        this.trackPerfEvent('HTMLImportsLoaded', 'Polymer')
        this.trackPerfEvent('WebComponentsReady', 'Polymer')

        this.trackOnlineStatus()

        var matches = exports.location.search.match(/utm_error=([^&]+)/)
        if (matches) {
          // Assume that the only time we'll be setting utm_error= is from the notification code.
          this.trackError('notification', decodeURIComponent(matches[ 1 ]))
        }

        /**
         * A collection of timing categories, each a collection of start times.
         * @private {!Object<string, Object<string, ?number>}
         */
        this.startTimes_ = {}
      }

      /**
       * Sets a default value for each custom dimension. This is necessary because
       * GA reports only include results if the result includes a value for every
       * dimension requested.
       */
      setTrackerDefaults () {
        ga('set', 'appName', PAIN.Config.AppName)
        ga('set', 'appVersion', PAIN.Config[ 'version_code' ])

        Object.keys(this.customDimensions).forEach(function (key) {
          ga('set', this.customDimensions[ key ], this.NULL_DIMENSION)
        }.bind(this))
      }

      /**
       * Creates a ready state deferred whose promise will be resolved once all
       * custom dimensions are set on the tracker. The promise is resolved in the
       * `updateTracker` method.
       * Exposing the resolve function outside of the closure is required since
       * code outside of this module (`<google-signin>`) calls `updateTracker`.
       * Note: setting custom dimensions needs to happen prior to sending the first
       * pageview, to ensure all hits can be grouped by these custom dimensions.
       */
      initTrackerReadyState () {
        this.readyState_ = PAIN.Util.General.createDeferred()

        // In the event of an error or a failure in the auth code, we set a
        // timeout so the promise always resolves. In such cases, some hits
        // will be sent with missing custom dimension values, but that's better
        // than them not being sent at all.
        setTimeout(function () {
          this.readyState_.resolve()

          // Tracks that this happened and when it happened.
          this.trackEvent('analytics', 'timeout', this.READY_STATE_TIMEOUT_,
            window.performance && Math.round(window.performance.now()))
        }.bind(this), this.READY_STATE_TIMEOUT_)
      }

      /**
       * Updates the tracker field with the specified value.
       * This logic also checks to see if all required dimension values have been
       * set and if so, resolves the ready state so future tracking calls happen
       * right away.
       * @param {string} field The analytics.js field name.
       * @param {value} value The field's value.
       */
      updateTracker (field, value) {
        ga(function (tracker) {
          ga('set', field, value) // Use the command queue for easier debugging.
          var requiredDimensionKeys = Object.keys(this.requiredDimensions)
          var hasAllRequiredDimensions = requiredDimensionKeys.every(function (key) {
            tracker.get(this.requiredDimensions[ key ]) !== this.NULL_DIMENSION
          }.bind(this))

          if (hasAllRequiredDimensions) {
            this.readyState_.resolve()
          }
        })
      }

      /**
       * Waits until the tracker's ready state promise has been resolved.
       * This happens once all custom dimension values have been set.
       * @return {Promise}
       */
      waitForTrackerReady () {
        return this.readyState_.promise
      }

      /**
       * Updates the tracker with the passed page path and sends a pageview.
       * Page view tracking is throttled to prevent logging page redirects by the
       * URL router.
       * @param {string} optPath The URL path value.
       * @param {function} optCallback Optional callback to be invoked after the
       *                   hit is recorded.
       */
      trackPageView (optPath, optCallback) {
        this.waitForTrackerReady().then(function () {
          if (optPath) {
            ga('set', 'page', optPath)
          }
          ga('send', 'pageview', { hitCallback: optCallback })
        })
      }

      /**
       * Tracks a performance timing. See
       * https://developers.google.com/analytics/devguides/collection/analyticsjs/user-timings
       * @param {string} category Category of timing (e.g. 'Polymer')
       * @param {string} variable Name of the timing (e.g. 'polymer-ready')
       * @param {number} time Time, in milliseconds.
       * @param {string=} optLabel An optional sublabel, for e.g. A/B test identification.
       * @param {number=} optMaxTime An optional max time, after which '- outliers' will be appended to variable name.
       * @param {object=} optObj Optional field object for additional params to send to GA.
       */
      trackPerf (category, variable, time, optLabel, optMaxTime, optObj) {
        this.waitForTrackerReady().then(function () {
          if (optMaxTime !== null && time > optMaxTime) {
            variable += ' - outliers'
          }
          time = parseInt(time, 10)
          optLabel = optLabel || this.NULL_DIMENSION

          // Sets the time value as a dimension so it can be more usefully reported
          // on (e.g. median, distribution, etc).
          optObj = optObj || {}
          optObj[ this.customDimensions.METRIC_VALUE ] = time

          // Sends an event and a timing hit. We keep the timing hit for historical
          // reasons, but since timing hits get sampled at processing time, and
          // their values can't be used in segments, events are more useful and
          // more accurate.
          ga('send', 'event', category, variable, optLabel, time, optObj)
          ga('send', 'timing', category, variable, time, optLabel, optObj)
        })
      }

      trackUserArrivedFromNotification () {
        console.log('trackUserArrivedFromNotification()')
        this.updateTracker(this.customDimensions.CAME_FROM_NOTIFICATION, true)
        this.trackEvent('fcm', 'sw-notification-click')
      }

      setUserId (userId) {
        this.waitForTrackerReady().then(function () {
          ga('set', 'userId', userId)
        })
      }

      /**
       * Tracks an event
       *
       * @param {string} category
       * @param {string} action
       * @param {string=} optLabel
       * @param {number=} optValue
       * @param {function()} optCallback Optional callback to be invoked after the
       *                   hit is recorded.
       */
      trackEvent (category, action, optLabel, optValue, optCallback) {
        this.waitForTrackerReady().then(function () {
          ga('send', {
            hitType: 'event',
            eventCategory: category,
            eventAction: action,
            eventLabel: optLabel || this.NULL_DIMENSION,
            eventValue: optValue,
            hitCallback: function (callback) {
              console.log('Analytics.prototype.trackEvent', callback)
              if (optCallback) {
                optCallback()
              }
            }
          })
        }.bind(this))
      }

      /**
       * Tracks an error event.
       *
       * @param {string} location
       * @param {string} message
       */
      trackError (location, message) {
        this.waitForTrackerReady().then(function () {
          ga('send', 'event', 'error', location, String(message))
        })
      }

      /**
       * Tracks a social action
       *
       * @param {string} network
       * @param {string} action
       * @param {string} target
       */
      trackSocial (network, action, target) {
        this.waitForTrackerReady().then(function () {
          ga('send', 'social', network, action, target)
        })
      }

      /**
       * Log Polymer startup performance numbers.
       */
      trackPerfEvent (eventName, categoryName) {
        if (!(exports.performance && exports.performance.getEntriesByName)) {
          return
        }

        var marks = performance.getEntriesByName(eventName, 'mark')
        if (marks.length) {
          var time = marks[ 0 ].startTime
          console.log(eventName, '@', time)
          this.trackPerf(categoryName, eventName, time, null, this.POLYMER_ANALYTICS_TIMEOUT_)
        } else {
          document.addEventListener(eventName, this.trackPerfEvent.bind(this, eventName, categoryName))
        }
      }

      /**
       * Stores a start time associated with a category and variable name. When an
       * end time is registered with matching variables, the time difference is
       * sent to analytics. Use unique names if a race condition between timings is
       * possible; if a start time with the same names is registerd without an end
       * time in between, the original start time is discarded.
       * @param {string} category Category of timing (e.g. 'Assets load time')
       * @param {string} variable Name of the timing (e.g. 'polymer-ready')
       * @param {number} timeStart A timestamp associated with start, in ms.
       */
      timeStart (category, variable, timeStart) {
        var categoryTimes = this.startTimes_[ category ] || (this.startTimes_[ category ] = {})
        categoryTimes[ variable ] = timeStart
      }

      /**
       * Ends a timing event. The difference between the time associated with this
       * event and the timeStart event with the matching category and variable names
       * is sent to analytics. If no match can be found, the time is discarded.
       * @param {string} category Category of timing (e.g. 'Assets load time')
       * @param {string} variable Name of the timing (e.g. 'polymer-ready')
       * @param {number} timeEnd A timestamp associated with end, in ms.
       * @param {string=} optLabel An optional sublabel, for e.g. A/B test identification.
       * @param {number=} optMaxTime An optional max time, after which '- outliers' will be appended to variable name.
       */
      timeEnd (category, variable, timeEnd, optLabel, optMaxTime) {
        var categoryTimes = this.startTimes_[ category ]
        if (!categoryTimes) {
          return
        }
        var timeStart = categoryTimes[ variable ]
        if (timeStart !== null) {
          this.trackPerf(category, variable, timeEnd - timeStart, optLabel, optMaxTime)
          categoryTimes[ variable ] = null
        }
      }

      /**
       * Adds event listeners to track when the network's online/offline status
       * changes, and updates the tracker with the new status.
       */
      trackOnlineStatus () {
        this.updateTracker(this.customDimensions.ONLINE, navigator.onLine)

        var updateOnlineStatus = function (event) {
          this.updateTracker(this.customDimensions.ONLINE, navigator.onLine)
          this.trackEvent('network', 'change', event.type)
        }.bind(this)

        window.addEventListener('online', updateOnlineStatus)
        window.addEventListener('offline', updateOnlineStatus)
      }

    }

    Analytics.prototype.POLYMER_ANALYTICS_TIMEOUT_ = 60 * 1000
    Analytics.prototype.FP_TIMEOUT_ = 6 * 1000
    Analytics.prototype.READY_STATE_TIMEOUT_ = 5 * 1000
    Analytics.prototype.NULL_DIMENSION = '(null)'

    // A map from each custom dimension name to its index in Google Analytics.
    Analytics.prototype.customDimensions = {
      SIGNED_IN: 'dimension1',
      ONLINE: 'dimension2',
      SERVICE_WORKER_STATUS: 'dimension3',
      NOTIFICATION_PERMISSION: 'dimension4',
      METRIC_VALUE: 'dimension5',
      CAME_FROM_NOTIFICATION: 'dimension6'
    }

    // A list of dimensions that must be set before the first hit is sent.
    Analytics.prototype.requiredDimensions = [
      Analytics.prototype.customDimensions.SIGNED_IN,
      Analytics.prototype.customDimensions.ONLINE,
      Analytics.prototype.customDimensions.SERVICE_WORKER_STATUS,
      Analytics.prototype.customDimensions.NOTIFICATION_PERMISSION
    ]

    return new Analytics()
  })(window)
window.dispatchEvent(new Event('analytics-global-ready'))
