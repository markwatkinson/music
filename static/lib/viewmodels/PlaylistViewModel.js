"use strict";
window.PlaylistViewModel = function() {
    var self = this,
        ignorePlaylistSelectChanges = false;
    
    this.playlist = new PlaylistModel( document.getElementById('current-audio') );
    
    this.knownPlaylists = ko.observableArray([]);
    
    // used to show some widgets to create a new playlist
    this.newPlaylist = ko.observable(false);
    
    this.playStates = {
        'STOPPED' : 0,
        'PLAYING' : 1,
        'PAUSED' : 2
    };
    
    
    this.state = ko.computed(function() {
        var paused, playing;
        paused = self.playlist.paused();
        playing = self.playlist.playing();
        if (!playing) return self.playStates.STOPPED;
        if (paused) return self.playStates.PAUSED;
        return self.playStates.PLAYING;
    });
    
    this.controls = {
        playOrPauseClick : function() {
            var state = self.state();
            if (state === self.playStates.PLAYING) {
                self.playlist.pause();
            } else {
                self.playlist.play();
            }
        },
        playOrPauseText: ko.computed(function() {
            var state = self.state();
            if (state === self.playStates.PLAYING) return 'Pause';
            if (state === self.playStates.PAUSED) return 'Play';
            return 'Stop';
        })
    }
    
    
    this.drop = function(event) {
        var source = event.originalEvent.dataTransfer.getData('text/html'),
            items;
        if (source === 'collection') {
            items = music.root.collectionVM.doWithDragged(function(items) {
                ko.utils.arrayForEach(items, function(item) {
                    self.playlist.add(item);
                });
            });
        }
        console.log('drop received from', source);
    }
    
    this.selection = {
        cursor: -1,
        lastCtrl : false,
        lastShift: false,
        
        
        clear: function() {
            music.utils.each(self.playlist.songs(), function(i, s) {
                s.playlistData.selected(false);
            });
        },
        setIndex: function(index, value) {
            var s = self.playlist.songs()[index];
            if (!s) return;
            s.playlistData.selected(value);
        },
        toggleIndex: function(index) {
            var s = self.playlist.songs()[index];
            if (!s) return;
            s.playlistData.selected(!s.playlistData.selected());
        },
        
        range : function(index1, index2) {
            var tmp, s;
            if (index1 > index2) {
                tmp = index1;
                index1 = index2;
                index2 = tmp;
            }
            while(index1 <= index2) {
                s = self.playlist.songs()[index1];
                if (!s) break;
                s.playlistData.selected(true);
                index1++;
            }
        },
        
        // click handler
        click : function(event, index) {
            var sel = self.selection;
            console.log(event);
            if (event.ctrlKey) {
                sel.toggleIndex(index);
                sel.lastCtrl = true;
                sel.lastShift = false;
                sel.cursor = index;
            } else if (event.shiftKey) {
                if (sel.lastShift) {
                    sel.clear();
                }
                if (sel.cursor < 0) sel.cursor = 0;
                sel.range(sel.cursor, index);
                sel.lastCtrl = false;
                sel.lastShift = true
                
                
            } else {
                sel.clear();
                sel.setIndex(index, true);
                sel.lastCtrl = false;
                sel.lastShift = false;
                sel.cursor = index;
            }
        },
        
        remove : function() {
            self.playlist.songs.remove(function(s) {
                return s.playlistData.selected();
            });
        },

        // FIXME this is hijacking everything, e.g. f5 doesn't work.
        keyPress: function(event) {
            var k = event.keyCode,
                sel = self.selection,
                handled = false;
            
            switch(k) {
                // delete
                case 46:
                    sel.remove();
                    handled = true;
                    break;
                // up arrow
                case 38:
                    sel.clear();
                    sel.cursor = Math.max(sel.cursor-1, 0);
                    sel.setIndex(sel.cursor, true);
                    handled = true;
                    break
                // down arrow
                case 40:
                    sel.clear();
                    sel.cursor = Math.min(sel.cursor+1, self.playlist.songs().length-1);
                    sel.setIndex(sel.cursor, true);
                    handled = true;
                    break;
                
                case 13: // enter
                case 32: // space
                    self.playlist.playIndex(sel.cursor);
                    handled = true;
                    break;
            }
            console.log(k, handled);
            return handled;
        }
    };

    
    this.selectToggleIndex = function(index) {
        var s = self.playlist.songs()[index];
        if (!s) return;
        s.playlistData.selected(!s.playlistData.selected());
    }
    
    
    this.loadPlaylist = function(name) {
        self.playlist.name(name);
        self.playlist.load();
    }
    this.loadPlaylists = function() {
        $.getJSON('playlist/get/', function(data) {
            // data should be an array
            data.sort();
            self.knownPlaylists(data);
        });
    }
    
    this.selectPlaylistChange = function(event) {
        var $e, val;
        if (ignorePlaylistSelectChanges) return;
        $e = $(event.target);
        val = $e.val();
        if (val) 
            self.loadPlaylist(val);
    }
    
    this.createNewPlaylist = function(formElement) {
        var $e = $(formElement);
        var name = $e.find('input[type=text]').val();
        ignorePlaylistSelectChanges = true;
        self.knownPlaylists.push(name);
        
        console.log('set name to', name);
        self.playlist.name(name);
        console.log('set name to', self.playlist.name());
        self.playlist.save();
        self.newPlaylist(false);
        self.loadPlaylists();
        ignorePlaylistSelectChanges = false;
    }
    
    this.loadPlaylists();
    this.playlist.load();
    
}