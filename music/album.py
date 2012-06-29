class Album(object):
    def __init__(self, title=None, artist=None, songs=[], year=None, artworkurl=None):
        self.title = title
        self.artist = artist
        self.songs = songs
        self.year = year
        self.artworkurl = artworkurl
        self.dbid = None
        
    def add_song(self, song):
        song.album = self
        self.songs.append(song)