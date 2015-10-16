goog.provide('shaka.polyfill.PatchedMediaKeys.ms');

goog.require('shaka.asserts');
goog.require('shaka.log');
goog.require('shaka.util.EventManager');
goog.require('shaka.util.FakeEvent');
goog.require('shaka.util.FakeEventTarget');
goog.require('shaka.util.PublicPromise');
goog.require('shaka.util.Uint8ArrayUtils');


/**
 * Install the polyfill.
 */
shaka.polyfill.PatchedMediaKeys.ms.install = function() {
  shaka.log.debug('ms.install');

  shaka.asserts.assert(HTMLMediaElement.prototype.msSetMediaKeys);

  // Alias.
  var ms = shaka.polyfill.PatchedMediaKeys.ms;

  // Construct fake key ID.  This is not done at load-time to avoid exceptions
  // on unsupported browsers.
  ms.MediaKeyStatusMap.KEY_ID_ =
      shaka.util.Uint8ArrayUtils.fromString('FAKE_KEY_ID');

  // Install patches.
  Navigator.prototype.requestMediaKeySystemAccess =
      ms.requestMediaKeySystemAccess;
  // Delete mediaKeys to work around strict mode compatibility issues.
  delete HTMLMediaElement.prototype['mediaKeys'];
  // Work around read-only declaration for mediaKeys by using a string.
  HTMLMediaElement.prototype['mediaKeys'] = null;
  HTMLMediaElement.prototype.setMediaKeys = ms.setMediaKeys;
  window.MediaKeys = ms.MediaKeys;
  window.MediaKeySystemAccess = ms.MediaKeySystemAccess;
};


/**
 * An implementation of Navigator.prototype.requestMediaKeySystemAccess.
 * Retrieve a MediaKeySystemAccess object.
 *
 * @this {!Navigator}
 * @param {string} keySystem
 * @param {!Array.<!MediaKeySystemConfiguration>} supportedConfigurations
 * @return {!Promise.<!MediaKeySystemAccess>}
 */
shaka.polyfill.PatchedMediaKeys.ms.requestMediaKeySystemAccess =
    function(keySystem, supportedConfigurations) {
  shaka.log.debug('ms.requestMediaKeySystemAccess');
  shaka.asserts.assert(this instanceof Navigator);

  // Alias.
  var ms = shaka.polyfill.PatchedMediaKeys.ms;
  try {
    var access = new ms.MediaKeySystemAccess(keySystem,
        supportedConfigurations);

    return Promise.resolve(/** @type {!MediaKeySystemAccess} */ (access));
  } catch (exception) {
    return Promise.reject(exception);
  }
};


/**
 * An implementation of HTMLMediaElement.prototype.setMediaKeys.
 * Attach a MediaKeys object to the media element.
 *
 * @this {!HTMLMediaElement}
 * @param {MediaKeys} mediaKeys
 * @return {!Promise}
 */
shaka.polyfill.PatchedMediaKeys.ms.setMediaKeys = function(mediaKeys) {
  shaka.log.debug('ms.setMediaKeys');
  shaka.asserts.assert(this instanceof HTMLMediaElement);

  // Alias.
  var ms = shaka.polyfill.PatchedMediaKeys.ms;

  var newMediaKeys =
      /** @type {shaka.polyfill.PatchedMediaKeys.ms.MediaKeys} */ (
          mediaKeys);
  var oldMediaKeys =
      /** @type {shaka.polyfill.PatchedMediaKeys.ms.MediaKeys} */ (
          this.mediaKeys);

  if (oldMediaKeys && oldMediaKeys != newMediaKeys) {
    shaka.asserts.assert(oldMediaKeys instanceof ms.MediaKeys);
    // Have the old MediaKeys stop listening to events on the video tag.
    oldMediaKeys.setMedia(null);
  }

  delete this['mediaKeys'];  // in case there is an existing getter
  this['mediaKeys'] = mediaKeys;  // work around read-only declaration

  if (newMediaKeys) {
    shaka.asserts.assert(newMediaKeys instanceof ms.MediaKeys);
    newMediaKeys.setMedia(this);
  }

  return Promise.resolve();
};



/**
 * An implementation of MediaKeySystemAccess.
 *
 * @constructor
 * @param {string} keySystem
 * @param {!Array.<!MediaKeySystemConfiguration>} supportedConfigurations
 * @implements {MediaKeySystemAccess}
 * @throws {Error} if the key system is not supported.
 */
shaka.polyfill.PatchedMediaKeys.ms.MediaKeySystemAccess =
    function(keySystem, supportedConfigurations) {
  shaka.log.debug('ms.MediaKeySystemAccess');

  /** @type {string} */
  this.keySystem = keySystem;

  /** @private {string} */
  this.internalKeySystem_ = keySystem;

  /** @private {!MediaKeySystemConfiguration} */
  this.configuration_;

  // This is only a guess, since we don't really know from the prefixed API.
  var allowPersistentState = true;

  if (keySystem == 'org.w3.clearkey') {
    // ClearKey's string must be prefixed in v0.1b.
    this.internalKeySystem_ = 'webkit-org.w3.clearkey';
    // ClearKey doesn't support persistence.
    allowPersistentState = false;
  }

  var success = false;
  for (var i = 0; i < supportedConfigurations.length; ++i) {
    var cfg = supportedConfigurations[i];

    // Create a new config object and start adding in the pieces which we
    // find support for.  We will return this from getConfiguration() if
    // asked.
    /** @type {!MediaKeySystemConfiguration} */
    var newCfg = {
      'audioCapabilities': [],
      'videoCapabilities': [],
      // It is technically against spec to return these as optional, but we
      // don't truly know their values from the prefixed API:
      'persistentState': 'optional',
      'distinctiveIdentifier': 'optional',
      // Pretend the requested init data types are supported, since we don't
      // really know that either:
      'initDataTypes': cfg.initDataTypes,
      'sessionTypes': ['temporary']
    };

    // v0.1b tests for key system availability with an extra argument on
    // canPlayType.
    var ranAnyTests = false;
    if (cfg.audioCapabilities) {
      for (var j = 0; j < cfg.audioCapabilities.length; ++j) {
        var cap = cfg.audioCapabilities[j];
        if (cap.contentType) {
          ranAnyTests = true;
          var contentType = cap.contentType.split(';')[0];
          if (MSMediaKeys.isTypeSupported(
              this.internalKeySystem_, contentType)) {
            newCfg.audioCapabilities.push(cap);
            success = true;
          }
        }
      }
    }
    if (cfg.videoCapabilities) {
      for (var j = 0; j < cfg.videoCapabilities.length; ++j) {
        var cap = cfg.videoCapabilities[j];
        if (cap.contentType) {
          ranAnyTests = true;
          if (MSMediaKeys.isTypeSupported(
              this.internalKeySystem_, contentType)) {
            newCfg.videoCapabilities.push(cap);
            success = true;
          }
        }
      }
    }

    if (!ranAnyTests) {
      // If no specific types were requested, we check all common types to find
      // out if the key system is present at all.
      success = MSMediaKeys.isTypeSupported(
          this.internalKeySystem_, 'video/mp4') ||
          MSMediaKeys.isTypeSupported(
              this.internalKeySystem_, 'video/webm');
    }
    if (cfg.persistentState == 'required') {
      if (allowPersistentState) {
        newCfg.persistentState = 'required';
      } else {
        success = false;
      }
    }

    if (success) {
      this.configuration_ = newCfg;
      return;
    }
  }  // for each cfg in supportedConfigurations

  throw Error('None of the requested configurations were supported.');
};


/** @override */
shaka.polyfill.PatchedMediaKeys.ms.MediaKeySystemAccess.prototype.
    createMediaKeys = function() {
  shaka.log.debug('ms.MediaKeySystemAccess.createMediaKeys');

  var config = this.getConfiguration();
  shaka.log.debug('Config ' + config);

  // Alias.
  var ms = shaka.polyfill.PatchedMediaKeys.ms;
  var mediaKeys = new ms.MediaKeys(this.internalKeySystem_);
  return Promise.resolve(/** @type {!MediaKeys} */ (mediaKeys));
};


/** @override */
shaka.polyfill.PatchedMediaKeys.ms.MediaKeySystemAccess.prototype.
    getConfiguration = function() {
  shaka.log.debug('ms.MediaKeySystemAccess.getConfiguration');
  return this.configuration_;
};



/**
 * An implementation of MediaKeys.
 *
 * @constructor
 * @param {string} keySystem
 * @implements {MediaKeys}
 */
shaka.polyfill.PatchedMediaKeys.ms.MediaKeys = function(keySystem) {
  shaka.log.debug('ms.MediaKeys');

  /** @private {string} */
  this.keySystem_ = keySystem;

  /** @private {HTMLMediaElement} */
  this.media_ = null;

  /** @private {MSMediaKeys} */
  this.msMediaKey_ = null;

  /** @private {Uint8Array} */
  this.initData_ = null;

  /** @private {!shaka.util.EventManager} */
  this.eventManager_ = new shaka.util.EventManager();

  /**
   * @private {!Array.<!MSMediaKeySession>}
   */
  this.newSessions_ = [];

  /**
   * @private {!Object.<string, !MSMediaKeySession>}
   */
  this.sessionMap_ = {};
};


/**
 * @param {HTMLMediaElement} media
 * @protected
 */
shaka.polyfill.PatchedMediaKeys.ms.MediaKeys.prototype.setMedia =
    function(media) {
  this.media_ = media;

  // Remove any old listeners.
  this.eventManager_.removeAll();

  if (media) {
    // Intercept and translate these prefixed EME events.
    this.eventManager_.listen(media, 'msneedkey',
        /** @type {shaka.util.EventManager.ListenerType} */ (
            this.onMsNeedKey_.bind(this)));

    if (!media.readyState) {
      this.eventManager_.listen(media, 'loadedmetadata',
          /** @type {shaka.util.EventManager.ListenerType} */ (
              this.onLoadedMetadata_.bind(this)));
    } else {
      this.onLoadedMetadata_();
    }
  }
};


/** @override */
shaka.polyfill.PatchedMediaKeys.ms.MediaKeys.prototype.createSession =
    function() {
  shaka.log.debug('ms.MediaKeys.createSession');
  shaka.asserts.assert(this.initData_);

  // Alias.
  var ms = shaka.polyfill.PatchedMediaKeys.ms;

  // Unprefixed EME allows for session creation without a video tag or src.
  // Prefixed EME requires both a valid HTMLMediaElement and a src.
  var media = this.media_ || /** @type {!HTMLMediaElement} */(
      document.createElement('video'));
  if (!media.src) media.src = 'about:blank';

  var session = this.msMediaKey_.createSession('video/mp4', this.initData_);
  session.generateRequest = function() {
    return Promise.resolve();
  };

  this.eventManager_.listen(session, 'mskeymessage',
      /** @type {function(Event)} */ (
          this.onMsKeyMessage_.bind(this)));

  this.eventManager_.listen(session, 'mskeyerror',
      /** @type {function(Event)} */ (
          this.onMsKeyError_.bind(this)));

  this.newSessions_.push(session);

  return session;
};


/** @override */
shaka.polyfill.PatchedMediaKeys.ms.MediaKeys.prototype.setServerCertificate =
    function(serverCertificate) {
  shaka.log.debug('ms.MediaKeys.setServerCertificate');

  // There is no equivalent in v0.1b, so return failure.
  return Promise.reject(new Error(
      'setServerCertificate not supported on this platform.'));
};


/**
 * @private
 */
shaka.polyfill.PatchedMediaKeys.ms.MediaKeys.prototype.onLoadedMetadata_ =
    function() {

  shaka.log.debug('ms.MediaKeys.onLoadedMetadata_');
  this.msMediaKey_ = new MSMediaKeys(this.keySystem_);

  this.media_.msSetMediaKeys(this.msMediaKey_);
};


/**
 * @private
 * @param {MSMediaKeyMessageEvent} event
 */
shaka.polyfill.PatchedMediaKeys.ms.MediaKeys.prototype.onMsKeyMessage_ =
    function(event) {

  var session = this.findSession_(event.target.sessionId);

  var event2 = shaka.util.FakeEvent.create({
    type: 'message',
    target: event.target,
    messageType: 'licenserequest',
    message: event.message.buffer
  });

  event.target.dispatchEvent(event2);
};


/**
 * @private
 * @param {Event} event
 */
shaka.polyfill.PatchedMediaKeys.ms.MediaKeys.prototype.onMsKeyError_ =
    function(event) {

  var session = /** @type {MSMediaKeySession} */ (event.currentTarget);
  var error;

  for (var prop in session.error) {
    if (prop != 'code' && session.error[prop] == session.error.code) {
      error = new Error(
          'EME Microsoft key error. Code: ' +
          session.error.code + ' - ' + prop + '.');
      break;
    }
  }

  throw error || new Error('EME Microsoft key error!');
};


/**
 * @param {!MediaKeyEvent} event to do rename
 * @private
 */
shaka.polyfill.PatchedMediaKeys.ms.MediaKeys.prototype.onMsNeedKey_ =
    function(event) {
  shaka.log.debug('ms.onMsNeedKey_', event);
  shaka.asserts.assert(this.media_);

  this.initData_ = event.initData;

  var event2 = shaka.util.FakeEvent.create({
    type: 'encrypted',
    initDataType: 'cenc',
    initData: event.initData
  });

  this.media_.dispatchEvent(event2);
};


/**
 * @param {string} sessionId
 * @return {MSMediaKeySession}
 * @private
 */
shaka.polyfill.PatchedMediaKeys.ms.MediaKeys.prototype.findSession_ =
    function(sessionId) {
  var session = this.sessionMap_[sessionId];
  if (session) {
    shaka.log.debug('ms.MediaKeys.findSession_', session);
    return session;
  }

  session = this.newSessions_.shift();
  if (session) {
    session.sessionId = sessionId;
    this.sessionMap_[sessionId] = session;
    shaka.log.debug('ms.MediaKeys.findSession_', session);
    return session;
  }

  return null;
};



/**
 * An implementation of Iterator.
 *
 * @param {!Array.<VALUE>} values
 *
 * @constructor
 * @implements {Iterator}
 * @template VALUE
 */
shaka.polyfill.PatchedMediaKeys.ms.Iterator = function(values) {
  /** @private {!Array.<VALUE>} */
  this.values_ = values;

  /** @private {number} */
  this.index_ = 0;
};


/**
 * @return {{value:VALUE, done:boolean}}
 */
shaka.polyfill.PatchedMediaKeys.ms.Iterator.prototype.next = function() {
  if (this.index_ >= this.values_.length) {
    return {value: undefined, done: true};
  }
  return {value: this.values_[this.index_++], done: false};
};



/**
 * An implementation of MediaKeyStatusMap.
 * This fakes a map with a single key ID.
 *
 * @constructor
 * @implements {MediaKeyStatusMap}
 */
shaka.polyfill.PatchedMediaKeys.ms.MediaKeyStatusMap = function() {
  /**
   * @type {number}
   */
  this.size = 0;

  /**
   * @private {string|undefined}
   */
  this.status_ = undefined;
};


/**
 * @const {!Uint8Array}
 * @private
 */
shaka.polyfill.PatchedMediaKeys.ms.MediaKeyStatusMap.KEY_ID_;


/**
 * An internal method used by the session to set key status.
 * @param {string|undefined} status
 */
shaka.polyfill.PatchedMediaKeys.ms.MediaKeyStatusMap.prototype.setStatus =
    function(status) {
  this.size = status == undefined ? 0 : 1;
  this.status_ = status;
};


/**
 * An internal method used by the session to get key status.
 * @return {string|undefined}
 */
shaka.polyfill.PatchedMediaKeys.ms.MediaKeyStatusMap.prototype.getStatus =
    function() {
  return this.status_;
};


/**
 * Array entry 0 is the key, 1 is the value.
 * @return {Iterator.<Array.<BufferSource|string>>}
 */
shaka.polyfill.PatchedMediaKeys.ms.MediaKeyStatusMap.prototype.entries =
    function() {
  var fakeKeyId =
      shaka.polyfill.PatchedMediaKeys.ms.MediaKeyStatusMap.KEY_ID_;
  /** @type {!Array.<!Array.<BufferSource|string>>} */
  var arr = [];
  if (this.status_) {
    arr.push([fakeKeyId, this.status_]);
  }
  return new shaka.polyfill.PatchedMediaKeys.ms.Iterator(arr);
};


/**
 * The functor is called with each value.
 * @param {function(string)} fn
 */
shaka.polyfill.PatchedMediaKeys.ms.MediaKeyStatusMap.prototype.forEach =
    function(fn) {
  if (this.status_) {
    fn(this.status_);
  }
};


/**
 * @param {BufferSource} keyId
 * @return {string|undefined}
 */
shaka.polyfill.PatchedMediaKeys.ms.MediaKeyStatusMap.prototype.get =
    function(keyId) {
  if (this.has(keyId)) {
    return this.status_;
  }
  return undefined;
};


/**
 * @param {BufferSource} keyId
 * @return {boolean}
 */
shaka.polyfill.PatchedMediaKeys.ms.MediaKeyStatusMap.prototype.has =
    function(keyId) {
  var fakeKeyId =
      shaka.polyfill.PatchedMediaKeys.ms.MediaKeyStatusMap.KEY_ID_;
  if (this.status_ &&
      shaka.util.Uint8ArrayUtils.equal(new Uint8Array(keyId), fakeKeyId)) {
    return true;
  }
  return false;
};


/**
 * @return {Iterator.<BufferSource>}
 */
shaka.polyfill.PatchedMediaKeys.ms.MediaKeyStatusMap.prototype.keys =
    function() {
  var fakeKeyId =
      shaka.polyfill.PatchedMediaKeys.ms.MediaKeyStatusMap.KEY_ID_;
  /** @type {!Array.<BufferSource>} */
  var arr = [];
  if (this.status_) {
    arr.push(fakeKeyId);
  }
  return new shaka.polyfill.PatchedMediaKeys.ms.Iterator(arr);
};


/**
 * @return {Iterator.<string>}
 */
shaka.polyfill.PatchedMediaKeys.ms.MediaKeyStatusMap.prototype.values =
    function() {
  /** @type {!Array.<string>} */
  var arr = [];
  if (this.status_) {
    arr.push(this.status_);
  }
  return new shaka.polyfill.PatchedMediaKeys.ms.Iterator(arr);
};

