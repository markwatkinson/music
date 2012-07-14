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


window.DyanimicRandomPlaylistModel = function() {
    
    SpecialPlaylistModel.call(this, {
        'id' : 'all',
        'name' : 'Dynamic random'
    });
    
    this.setup = function() {
         music.root.playlistVM.playlist.special( 
            new SpecialPlaylistModeDynamicRandom(
                music.root.collectionVM,
                music.root.playlistVM.playlist
            )
        );
        music.root.playlistVM.playlist.special().start();
    }
    
    this.dragFunc = function(action) {
       this.setup();
    }
    
    this.click = this.setup;
};

DyanimicRandomPlaylistModel.prototype = new SpecialPlaylistModel();

DyanimicRandomPlaylistModel.prototype.constructor = DyanimicRandomPlaylistModel