"use strict";
window.SpecialPlaylistModel = function(data) {
    data = data || {};
    this.name = data.name;
    this.id = data.id;
    this.dragFunc = data.dragFunc;
}


window.AllTracksPlaylistModel = function() {
    
    SpecialPlaylistModel.call(this, {
        'id' : 'all',
        'name' : 'All tracks'
    });
    
    this.dragFunc = function(action) {
        var artists = music.root.collectionVM.artists(),
            waiting = artists.length,
            f = function() {
                waiting--;
                if (waiting === 0) {
                    action(artists);
                }
            }
        
        if (!artists.length) f();
        else {
            ko.utils.arrayForEach(artists, function(item) {
                item.loadChildren(f);
            });
        }
    }
};

AllTracksPlaylistModel.prototype = new SpecialPlaylistModel();

AllTracksPlaylistModel.prototype.constructor = AllTracksPlaylistModel