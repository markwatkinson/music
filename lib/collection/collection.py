import datatypes

class Collection(object):

    artists = []
    
    def __find_in(self, collection, key, value):
        for e in collection:
            if e.get(key) == value: return e
        return None

    def merge_song(self, song, album):
        s = self.__find_in(album.get('songs'), 'title', song.get('title'))
        if s: s.merge(song)
        else: album.add_song(song)
            
    def merge_album(self, album, artist):
        a = self.__find_in(artist.get('albums'), 'title', album.get('title'))
        if a: a.merge(album)
        else: 
            artist.add_album(album)
            a = album
        for song in album.get('songs'):
            self.merge_song(song, a)
    
    def merge_artist(self, artist):
        a = self.__find_in(self.artists, 'name', artist.get('name'))
        if a: a.merge(artist)
        else: 
            self.artists.append(artist)
            a = artist
        
        for album in artist.get('albums'):
            self.merge_album(album, a)
            
