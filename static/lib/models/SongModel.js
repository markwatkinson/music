"use strict";
window.SongModel = function(data) {
    var self = this;
    Model.prototype.constructor.call(this);
    this.title = ko.observable('');
    this.trackNo = ko.observable(0);
    this.album = new AlbumModel();
    this.length = ko.observable(0);
    
    this.url = '';
    
    this.attrs(['title', 'trackNo', 'album', 'length', 'url']);
    this.attrTypes({album: AlbumModel});
    this.set(data);
    
    this.prettyLength = ko.computed(function() {
        var l = self.length(), 
            s, m, ret = '';
        s = l % 60;
        l /= 60;
        l = parseInt('' + l, 10);
        m = l
        
        if (s == 0) s = '00';
        else if (s<10) s = '0' + s;
        ret = m + ':' + s;
        return ret;
    });

}

SongModel.prototype = new Model();
SongModel.prototype.constructor = SongModel;

SongModel.prototype.path = function() {
    return this.album.path() + '/' + this.url;
}


SongModel.prototype.clone = function() {
    // this is currently just used by the playlist and doesn't need to be 
    // deep
    var s = new SongModel({
        title: this.title(),
        trackNo : this.trackNo(),
        length: this.length(),
        url: this.url
    });
    s.album = this.album;
    return s;
}


SongModel.prototype.toJSON = function() {
    // omit the album or it's circular
    var property, ret = {};
    for (property in this) {
        if (this.hasOwnProperty(property) && property != 'album') {
            ret[property] = this[property];
        }
    }
    ret.uid = this.path();
    return ret;
}