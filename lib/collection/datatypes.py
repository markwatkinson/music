import re


class MusicObject(object):
    """ Abstract class for artist/album/song subclasses """
    attrs = []
    data = {}
    dbid = None
    url_base = None
    mergable = []
    
    def __init__(self, data, attrs, url_base):
        # this is used for the URL
        self.url_base = url_base
        self.attrs = attrs
        self.data = {}
        self.set_dict(data)
        self.dbid = None
    
    def set_dict(self, data):
        for key in data:
            self.set_val(key, data[key])

    def set_val(self, key, value):
        if key in self.attrs:
            self.data[key] = value
        if key == self.url_base:
            self.generate_url()


    def get(self, value, default=None):
        if value not in self.attrs: raise AttributeError ('No such attribute')
        return self.data.get(value, default)

    def getl(self, *attrs):
        """ Return a list of the given attributes """
        l = []
        for a in attrs:
            l.append( self.get(a) )
        return l
            
        
    def generate_url(self):
        """ 
            Generate and self-set a clean URL for the given item from its
            URL base key
        """
        if not self.url_base: raise Exception
        s = re.sub('[^a-zA-Z_0-9]+', '-', self.data.get(self.url_base))
        s = re.sub('--+', '-', s)
        s = re.sub('^-|-$', '', s)
        s = s.lower()
        self.set_val('url', s)
        return s
        
    def merge(self, obj):
        for k in obj.data:
            if k in self.mergable:
                self.set_val(k, obj.data[k])
        self.dbid = obj.dbid

class Song(MusicObject):
    
    def __init__(self, data):
        attrs = ['title', 'album', 'trackno', 'length', 'filepath', 'url']
        super(Song, self).__init__(data, attrs, 'title')
        self.mergable = ['title', 'trackno', 'length', 'filepath']
        
        
    def full_url(self):
        return self.get('album').full_url() + '/' + self.get('url')
        
class Album(MusicObject):
    
    def __init__(self, data):
        attrs = ['title', 'artist', 'songs', 'year', 'artworkurl', 'url']
        if not data.get('songs', []): 
            data['songs'] = []
        super(Album, self).__init__(data, attrs, 'title')
        self.mergable = ['title', 'year', 'artworkurl']

    def add_song(self, song):
        if not isinstance(song, Song):
            song = Song(song)
        song.set_val('album', self)
        self.get('songs').append(song)
        
    def full_url(self):
        return self.get('artist').full_url() + '/' + self.get('url')
        
class Artist(MusicObject):
    
    def __init__(self, data):
        attrs = ['name', 'albums', 'url']
        if not data.get('albums', []):
            data['albums'] = []
        super(Artist, self).__init__(data, attrs, 'name')
        self.mergable = ['name']
        
    def add_album(self, album):
        if not isinstance(album, Album):
            album = Album(album)
        album.set_val('artist', self)
        self.get('albums').append(album)

    def full_url(self):
        return self.get('url')
