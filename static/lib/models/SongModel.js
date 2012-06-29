"use strict";
window.SongModel = function(data) {
    var self = this;
    Model.prototype.constructor.call(this);
    this.title = ko.observable('');
    this.trackNo = ko.observable(0);
    this.album = new AlbumModel();
    this.length = ko.observable(0);
    
    this.attrs(['title', 'trackNo', 'album', 'length']);
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
    
    this.path = function() {
        return music.utils.formatPath(this.album.artist.name()) + '/' + 
            music.utils.formatPath(this.album.title()) + '/' + 
            music.utils.formatPath(this.title());
    }.bind(this);
}


SongModel.prototype = new Model();
SongModel.prototype.constructor = SongModel;