/**
 * @fileoverview Overrides DashVideoSource class in order to allow
 *               add external subtitles to media
 */

goog.provide('shaka.player.DashVideoSourceExternalSubtitles');


goog.require('shaka.player.DashVideoSource');
goog.require('shaka.util.PublicPromise');



/**
 * @constructor
 * @param {string} subtitleLang Subtitle Language (e.g. 'por')
 * @param {string} subtitleUri Subtitle URI
 */
shaka.player.ExternalSubtitle = function(subtitleLang, subtitleUri) {
  /** @private {string} */
  this.lang_ = subtitleLang;

  /** @private {goog.Uri} */
  this.uri_ = subtitleUri ? new goog.Uri(subtitleUri) : null;
};


/**
 * @return {string} Subtitle Mime Type (e.g. text/vtt)
 */
shaka.player.ExternalSubtitle.prototype.getMimeType = function() {
  if (this.uri_.toString().indexOf('.vtt') > 0)
    return 'text/vtt';

  return '';
};


/**
 * @return {string} Subtitle Language
 */
shaka.player.ExternalSubtitle.prototype.getLanguage = function() {
  return this.lang_;
};


/**
 * @return {goog.Uri} Subtitle URI
 */
shaka.player.ExternalSubtitle.prototype.getUri = function() {
  return this.uri_;
};



/**
 * @param {string} mpdUrl The MPD URL.
 * @param {shaka.player.DashVideoSource.ContentProtectionCallback}
 *     interpretContentProtection A callback to interpret the ContentProtection
 *     elements in the MPD.
 * @constructor
 * @extends {shaka.player.DashVideoSource}
 */
shaka.player.DashVideoSourceExternalSubtitles =
    function(mpdUrl, interpretContentProtection) {
  shaka.player.DashVideoSource.call(this, mpdUrl, interpretContentProtection);

  /** @private {!shaka.util.PublicPromise} */
  this.requestMpdPromise_ = new shaka.util.PublicPromise();

  /** @private {Array.<shaka.player.ExternalSubtitle>} */
  this.subtitles_ = [];
};
goog.inherits(
    shaka.player.DashVideoSourceExternalSubtitles,
    shaka.player.DashVideoSource);


/**
 * Append an external subtitle
 *
 * @param {string} subtitleLang Language of subtitle (e.g. 'eng')
 * @param {string} subtitleUri Subtitle URI
 */
shaka.player.DashVideoSourceExternalSubtitles.prototype.addSubtitle =
    function(subtitleLang, subtitleUri) {

  this.subtitles_.push(
      new shaka.player.ExternalSubtitle(subtitleLang, subtitleUri));
};


/**
 * @param {shaka.dash.mpd.Mpd} mpd
 */
shaka.player.DashVideoSourceExternalSubtitles.prototype.injectSubtitles =
    function(mpd) {

  for (var i = 0; i < this.subtitles_.length; i++) {
    var subtitle = this.subtitles_[i];

    var adaptationSet = new shaka.dash.mpd.AdaptationSet();
    adaptationSet.mimeType = subtitle.getMimeType();
    adaptationSet.lang = subtitle.getLanguage();
    adaptationSet.contentType = 'text';

    var representation = new shaka.dash.mpd.Representation();
    representation.baseUrl = subtitle.getUri();

    representation.lang = subtitle.getLanguage();
    representation.mimeType = subtitle.getMimeType();

    adaptationSet.representations.push(representation);

    mpd.periods[0].adaptationSets.push(adaptationSet);
  }

  this.requestMpdPromise_.resolve(mpd);
};


/** @override */
shaka.player.DashVideoSourceExternalSubtitles.prototype.requestMpd =
    function(mpdUrl) {

  var self = this;

  new shaka.dash.MpdRequest(mpdUrl)
      .send()
      .then(function(mpd) {
        self.injectSubtitles(mpd);
      });

  return this.requestMpdPromise_;
};
