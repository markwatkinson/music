import os

import tagpy

from collection import Collection 
import datatypes

class FSCollection(Collection):
    
    directories = []
    files = []
    songs = []
    # supported filetypes, this should be set by the caller
    extensions = ['ogg']
    
    def __init__(self, directories):
        self.directories = [directories] if isinstance(directories, str) else directories
        self.files = []
        self.songs = []
        self.extensions = ['ogg']
        super(FSCollection, self).__init__()
        
    def __is_supported(self, filename):
        for e in self.extensions:
            if filename.endswith('.' + e): return True
        return False
        
    def __scan_recurse(self, directory):
        for f in os.listdir(directory):
            fullpath = directory
            if not fullpath.endswith('/'): fullpath += '/'
            fullpath += f
            if f.startswith('.'): 
                continue
            elif os.path.isdir(fullpath):
                self.__scan_recurse(fullpath)
            elif self.__is_supported(f):
                self.files.append(fullpath)
                
                
    def __scan(self):
        for d in self.directories:
            if os.path.isdir(d): self.__scan_recurse(d)
            
            
            
    def __build_songs(self):
        # some stuff for album art evaluation
        def art_cmp(a, b):
            c = os.path.getsize(a) - os.path.getsize(b)
            if c < 0: return -1
            if c > 0: return 1
            return 0
        def is_img(path):
            for e in ['jpg', 'jpeg', 'png']:
                if path.endswith('.' + e): return True
            return False

        art_cache = {}
        
        for path in self.files:
            fref = tagpy.FileRef(path)
            tag = fref.tag()
            dirname = os.path.dirname(path)
            
            art = art_cache.get(dirname, None)
            if art is None:
                images = filter(is_img, os.listdir(dirname))
                images.sort(art_cmp)
                art = os.path.abspath(dirname + '/' + images[0]) if images else None
                art_cache[path] = art
            
            song_data = {
                'artist': tag.artist,
                'album' : tag.album,
                'year' : tag.year,
                'title' : tag.title,
                'trackno': tag.track,
                'length' : fref.audioProperties().length,
                'art' : art
            }
            self.songs.append((path, song_data))
            
            
    def build(self):
        self.__scan()
        self.__build_songs()
        for path, tag in self.songs:
            artist = datatypes.Artist({'name' : tag['artist']})
            album = datatypes.Album({
                'title' : tag['album'], 
                'year' : tag['year'],
                'artworkurl' : tag['art']
            })
            song = datatypes.Song({
                'title' : tag['title'],
                'trackno' : tag['trackno'],
                'length' : tag['length'],
                'filepath' : path
            })
            album.add_song(song)
            artist.add_album(album)
            self.merge_artist(artist)
            
            
if __name__ == '__main__':
    c = FSCollection('/mnt/storage/music')
    c.build()
    for artist in c.artists:
        print artist.get('name')
        for album in artist.get('albums'):
            print '\t' + album.get('title')
            for song in album.get('songs'):
                print '\t\t' + song.get('title')
        