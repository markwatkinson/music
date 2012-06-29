class Artist(object):
    def __init__(self, name=None, albums=[]):
        self.name = name
        self.albums = albums
        self.dbid = None
        
    def add_album(self, album):
        album.artist = self
        self.albums.append(album)