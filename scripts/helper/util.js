(function () {
  /**
   * Custom window.console implementation
   */

  const originalLog = window.console.log

  window.console.log = function (varArgs) {
    if (window.APP_CONFIG.env !== 'prod') {
      originalLog.apply(window.console, arguments)
    }
  }

  const originalInfo = window.console.info

  window.console.info = function (varArgs) {
    if (window.APP_CONFIG.env !== 'prod') {
      originalInfo.apply(window.console, arguments)
    }
  }

  const originalError = window.console.error

  window.console.error = function (varArgs) {
    if (window.APP_CONFIG.env !== 'prod') {
      originalError.apply(window.console, arguments)
    }
  }

  const originalWarn = window.console.warn

  window.console.warn = function (varArgs) {
    if (window.APP_CONFIG.env !== 'prod') {
      originalWarn.apply(window.console, arguments)
    }
  }

  /**
   * Provides utils methods to obtain information about & from browser
   */
  class BrowserInfo {
    static isIOS () {
      return (/(iPhone|iPad|iPod)/gi).test(navigator.platform)
    }

    static isAndroid () {
      return (/Android/gi).test(navigator.userAgent)
    }

    static isSafari () {
      const userAgent = navigator.userAgent
      return (/Safari/gi).test(userAgent) && !(/Chrome/gi).test(userAgent)
    }

    static isIE () {
      const userAgent = navigator.userAgent
      return (/Trident/gi).test(userAgent)
    }

    static isEdge () {
      return /Edge/i.test(navigator.userAgent)
    }

    static isFF () {
      const userAgent = navigator.userAgent
      return (/Firefox/gi).test(userAgent)
    }

    static isTouchScreen () {
      return ('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch
    }

    /**
     * Returns the Chrome version number.
     * @return {Number} The Chrome version number.
     */
    static getChromeVersion () {
      const raw = navigator.userAgent.match(/Chrome\/([0-9]+)\./)
      return raw ? parseInt(raw[ 1 ], 10) : false
    }

    /**
     * Returns the Firefox version number.
     * @return {Number} The Firefox version number.
     */
    static getFirefoxVersion () {
      const raw = navigator.userAgent.match(/Firefox\/([0-9]+)\./)
      return raw ? parseInt(raw[ 1 ], 10) : false
    }

    static getUserLanguage () {
      let lang = window.navigator.languages ? window.navigator.languages[ 0 ] : null
      lang = lang || window.navigator.language || window.navigator.browserLanguage || window.navigator.userLanguage
      if (lang.indexOf('-') !== -1) {
        lang = lang.split('-')[ 0 ]
      }
      if (lang.indexOf('_') !== -1) {
        lang = lang.split('_')[ 0 ]
      }
      return lang
    }

  }

  /**
   * General utils methods
   */
  class Utils {

    static waitForAnalytics () {
      return Utils.waitForGlobal('Analytics')
    }

    static waitForGlobal (globalName) {
      window.globalPromises = window.globalPromises || {}
      if (!window.globalPromises[ globalName ]) {
        window.globalPromises[ globalName ] = new Promise((resolve, reject) => {
          if (PAIN[ globalName ]) {
            resolve()
          } else {
            window.addEventListener(globalName.toLowerCase() + '-global-ready', () => {
              resolve()
            })
          }
        })
      } else {
      }
      return window.globalPromises[ globalName ]
    }

    /**
     * Create a deferred object, allowing a Promise to be fulfilled at a later
     * time.
     * @return {{promise: !Promise, resolve: function(), reject: function()}} A deferred object, allowing a Promise to be fulfilled at a later time.
     */
    static createDeferred () {
      let resolveFn
      let rejectFn
      let promise = new Promise(function (resolve, reject) {
        resolveFn = resolve
        rejectFn = reject
      })
      return {
        promise: promise,
        resolve: resolveFn,
        reject: rejectFn
      }
    }

    /**
     * Sets the <meta name="theme-color"> to the specified value.
     * @param {string} color Color hex value.
     */
    static setMetaThemeColor (color) {
      const metaTheme = document.documentElement.querySelector('meta[name="theme-color"]')
      if (metaTheme) {
        metaTheme.content = color
      }
    }

    /**
     * Returns the static base URL of the running app.
     * https://events.google.com/io2016/about -> https://events.google.com/io2016/
     */
    static getStaticBaseURL () {
      const url = location.href.replace(location.hash, '')
      return url.substring(0, url.lastIndexOf('/') + 1)
    }

    /**
     * Gets a param from the search part of a URL by name.
     * @param {string} param URL parameter to look for.
     * @return {string|undefined} undefined if the URL parameter does not exist.
     */
    static getURLParameter (param) {
      if (!window.location.search) {
        return undefined
      }
      const m = new RegExp(param + '=([^&]*)').exec(window.location.search.substring(1))
      if (!m) {
        return undefined
      }
      return decodeURIComponent(m[ 1 ])
    }

    /**
     * Removes a param from the search part of a URL.
     * @param {string} search Search part of a URL, e.g. location.search.
     * @param {string} name Param name.
     * @return {string} Modified search.
     */
    static removeSearchParam (search, name) {
      if (search[ 0 ] === '?') {
        search = search.substring(1)
      }
      const parts = search.split('&')
      const res = []
      for (let i = 0; i < parts.length; i++) {
        const pair = parts[ i ].split('=')
        if (pair[ 0 ] === name) {
          continue
        }
        res.push(parts[ i ])
      }
      search = res.join('&')
      if (search.length > 0) {
        search = '?' + search
      }
      return search
    }

    /**
     * Adds a new or replaces existing param of the search part of a URL.
     * @param {string} search Search part of a URL, e.g. location.search.
     * @param {string} name Param name.
     * @param {string} value Param value.
     * @return {string} Modified search.
     */
    static setSearchParam (search, name, value) {
      search = removeSearchParam(search, name)
      if (search === '') {
        search = '?'
      }
      if (search.length > 1) {
        search += '&'
      }
      return search + name + '=' + encodeURIComponent(value)
    }

    /**
     * Reports an error to Google Analytics.
     * Normally, this is done in the window.onerror handler, but this helper method can be used in the
     * catch() of a promise to log rejections.
     * @param {Error|string} error The error to report.
     */
    static reportError (error) {
      // Google Analytics has a max size of 500 bytes for the event location field.
      // If we have an error with a stack trace, the trailing 500 bytes are likely to be the most
      // relevant, so grab those.
      const location = (error && typeof error.stack === 'string') ? error.stack.slice(-500) : 'Unknown Location'
      Utils.waitForAnalytics()
        .then(() => {
          PAIN.Analytics.trackError(location, error)
        })
    }

    /**
     * Returns the target element that was clicked/tapped.
     * @param {Event} e The click/tap event.
     * @param {string} tagName The element tagName to stop at.
     * @return {Element} The target element that was clicked/tapped.
     */
    static getEventSender (e, tagName) {
      const path = Polymer.dom(e).path

      let target = null
      for (let i = 0; i < path.length; ++i) {
        const el = path[ i ]
        if (el.localName === tagName) {
          target = el
          break
        }
      }

      return target
    }

    /**
     * Returns the first paint metric (if available).
     * @return {number} The first paint time in ms.
     */
    static getFPIfSupported () {
      if (window.chrome && window.chrome.loadTimes) {
        const load = window.chrome.loadTimes()
        const fp = (load.firstPaintTime - load.startLoadTime) * 1000
        return Math.round(fp)
      } else if ('performance' in window) {
        const navTiming = window.performance.timing
        // See http://msdn.microsoft.com/ff974719
        if (navTiming && navTiming.msFirstPaint && navTiming.navigationStart !== 0) {
          // See http://msdn.microsoft.com/ff974719
          return navTiming.msFirstPaint - navTiming.navigationStart
        }
      }

      return null
    }

    static extend (obj1, obj2) {
      if (!obj1) obj1 = {}
      for (let i in obj2) {
        if (obj2.hasOwnProperty(i)) {
          obj1[ i ] = obj2[ i ]
        }
      }
      return obj1
    }

  }

  PAIN.Util = PAIN.Util || (function () {
      'use strict'
      return {
        General: Utils,
        Browser: BrowserInfo
      }
    })()
})()
