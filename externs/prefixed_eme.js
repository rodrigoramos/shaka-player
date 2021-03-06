/**
 * Copyright 2014 Google Inc.
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
 *
 * @fileoverview Externs for prefixed EME v0.1b.
 * @externs
 */


/**
 * @param {string} keySystem
 * @param {Uint8Array} key
 * @param {Uint8Array} keyId
 * @param {string} sessionId
 */
HTMLMediaElement.prototype.webkitAddKey =
    function(keySystem, key, keyId, sessionId) {};


/**
 * @param {string} keySystem
 * @param {string} sessionId
 */
HTMLMediaElement.prototype.webkitCancelKeyRequest =
    function(keySystem, sessionId) {};


/**
 * @param {string} keySystem
 * @param {!Uint8Array} initData
 */
HTMLMediaElement.prototype.webkitGenerateKeyRequest =
    function(keySystem, initData) {};


/**
 * @param {string} mimeType
 * @param {string=} opt_keySystem
 * @return {string} '', 'maybe', or 'probably'
 */
HTMLVideoElement.prototype.canPlayType =
    function(mimeType, opt_keySystem) {};


/** @param {MSMediaKeys} msMediaKeys */
HTMLMediaElement.prototype.msSetMediaKeys =
    function(msMediaKeys) {};



/**
 * @constructor
 * @param {string} type
 * @param {Object=} opt_eventInitDict
 * @extends {Event}
 */
function MediaKeyEvent(type, opt_eventInitDict) {}


/**
 * @type {string}
 * @const
 */
MediaKeyEvent.prototype.keySystem;


/**
 * @type {string}
 * @const
 */
MediaKeyEvent.prototype.sessionId;


/**
 * @type {Uint8Array}
 * @const
 */
MediaKeyEvent.prototype.initData;


/**
 * @type {Uint8Array}
 * @const
 */
MediaKeyEvent.prototype.message;


/**
 * @type {string}
 * @const
 */
MediaKeyEvent.prototype.defaultURL;


/**
 * @type {MediaKeyError}
 * @const
 */
MediaKeyEvent.prototype.errorCode;


/**
 * @type {number}
 * @const
 */
MediaKeyEvent.prototype.systemCode;


/**
 * @type {!HTMLMediaElement}
 * @const
 */
MediaKeyEvent.prototype.target;



/** @constructor */
function MediaKeyError() {}


/** @type {number} */
MediaKeyError.prototype.code;


/** @type {number} */
MediaKeyError.prototype.systemCode;



/**
  * @constructor
  * @param {string} keySystem
  */
function MSMediaKeys(keySystem) {}


/**
 * @param {string} type MIME Type
 * @param {Uint8Array} initData CDM Initialization Data
 * @param {Object=} opt_cdmData CDM Data
 */
MSMediaKeys.prototype.createSession = function(type, initData, opt_cdmData) {};



/**
 * An implementation of MediaKeySession.
 *
 * @constructor
 * @implements {MediaKeySession}
 * @extends {shaka.util.FakeEventTarget}
 */
function MSMediaKeySession() {}


/** @const {string} */
MSMediaKeySession.prototype.sessionId;


/** @const {number} */
MSMediaKeySession.prototype.expiration;


/** @const {!Promise} */
MSMediaKeySession.prototype.closed;


/** @const {!MediaKeyStatusMap} */
MSMediaKeySession.prototype.keyStatuses;


/** @type {MSMediaKeyError} */
MSMediaKeySession.prototype.error;


/**
 * @param {string} initDataType
 * @param {?BufferSource} initData
 * @nosideeffects
 * @return {!Promise}
 */
MSMediaKeySession.prototype.generateRequest =
    function(initDataType, initData) {};


/**
 * @param {string} sessionId
 * @return {!Promise.<boolean>}}
 */
MSMediaKeySession.prototype.load = function(sessionId) {};


/**
 * @param {?BufferSource} response
 * @return {!Promise}
 */
MSMediaKeySession.prototype.update = function(response) {};


/** @return {!Promise} */
MSMediaKeySession.prototype.close = function() {};


/** @return {!Promise} */
MSMediaKeySession.prototype.remove = function() {};


/** @override */
MSMediaKeySession.prototype.dispatchEvent = function(evt) {};



/**
 * @constructor
 * @extends {Event}
 */
function MSMediaKeyMessageEvent() {}


/** @type {string} */
MSMediaKeyMessageEvent.prototype.destinationURL;


/** @type {Uint8Array} */
MSMediaKeyMessageEvent.prototype.message;



/**
 * @constructor
 */
function MSMediaKeyError() {}


/** @type {string} */
MSMediaKeyError.prototype.code;
