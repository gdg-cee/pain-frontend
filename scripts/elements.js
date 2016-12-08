(function () {
  'use strict'

  PAIN.Elements = window.PAIN.Elements || {}

  const flatten = (a) => a.reduce((a, b) => a.concat(Array.isArray(b) ? flatten(b) : b), [])

  let flattenBehaviors = (behaviors) => flatten(behaviors)

  PAIN.behaviors = PAIN.behaviors || {}
  PAIN.behaviors.get = PAIN.behaviors.get || flattenBehaviors
})()
