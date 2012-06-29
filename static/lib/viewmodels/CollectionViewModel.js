"use strict";
window.CollectionViewModel = function() {
    var self = this,
        clickTimer,
        lastClickTarget;
    
    this.artists = ko.observableArray([]);


    this.toggleExpand = function(item) {
        item.loadChildren(function(newChildren) {
            item.collectionData.toggleExpand();
        });
    }.bind(this);
    
    
    
    
    this.click = function(item) {
        var clickData = item.collectionData.clickData,
            time = +new Date(),
            threshold = 150,
            doubleClick = time - clickData.lastClick < threshold;
        console.log(doubleClick);
        if (doubleClick) {
            clickData.lastClick = 0;
            clearTimeout(clickData.timer);
            item.loadChildren(function() {
                music.root.playlist.addToPlaylist(item);
            });
        }
        else {
            clickData.timer = setTimeout(function() {
                self.toggleExpand(item);
                clickData.lastClick = 0;
            }, threshold);
            clickData.lastClick = time;
        }
    }

    this.load = function(callback) {
        var path = music.paths.data, artist;
        
        music.utils.getJSON(path, function(data) {
            music.utils.each(data.artists, function(i, e) {
                artist = new ArtistModel(e);
                self.artists.push(artist);
            });
            self.artists.sort(function(a, b) { 
                return a.name().toLowerCase().localeCompare(b.name().toLowerCase());
            });
        });
    }
}
