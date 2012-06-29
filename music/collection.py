import re
import os


import tagpy

import album, artist, song


# Pretty much all of this needs rewriting if it ever needs expanding.
# it's not good.


def url(identifier):
    s = re.sub('[^a-zA-Z_0-9]+', '-', identifier)
    s = re.sub('--+', '-', s)
    s = re.sub('^-|-$', '', s)
    s = s.lower()
    return s



class Collection(object):
    
    def __init__(self):

        self.artists = []

            
    def merge_song(self, song_obj, target_album):
        to_merge = None
        for s in target_album.songs:
            if s.title == song_obj.title:
                to_merge = s
                break
            
        if to_merge:
            s.album = target_album
            s.trackno = song_obj.trackno
            s.length = song_obj.length
            s.filepath = song_obj.filepath
        else:
            target_album.songs.append(song_obj)

    def merge_album(self, album_obj, target_artist):
        to_merge = None
        for a in target_artist.albums:
            if a.title == album_obj.title:
                to_merge = a
                break

        if to_merge: 
            to_merge.artist = target_artist
            to_merge.title = album_obj.title
            to_merge.year = album_obj.year
            to_merge.artworkurl = album_obj.artworkurl
            to_merge.dbid = album_obj.dbid
            for s in album_obj.songs: 
                self.merge_song(s, to_merge)
        else:
            target_artist.albums.append(album_obj)

    def merge_artist(self, artist_obj):
        to_merge = None
        for a in self.artists:
            if a.name == artist_obj.name: 
                to_merge = a
                break
        if to_merge:
            pass
            for a in artist_obj.albums:
                self.merge_album(a, to_merge)
        else:
            self.artists.append(artist_obj)

class FSCollection(Collection):
    
    def __init__(self, directories):
        self.directories = [directories] if isinstance(directories, str) else directories
        self.files = []
        self.songs = []
        self.extensions = ['ogg', 'mp3', 'flac', 'wav']
        super(FSCollection, self).__init__()

        
    
    
    def build_collection(self):

        self.scan()
        print 'scanned'
        self.build_songs()
        print 'built'
        for path, tag in self.songs:
            
            if not tag: 
                continue
            artist_ = tag['artist']
            album_ = tag['album']
            year_ = tag['year']
            trackno_ = tag['trackno']
            title_ = tag['title']

            artist_obj = artist.Artist(name=artist_, albums=[])
            artist_obj.url = url(artist_obj.name)
            album_obj = album.Album(title=album_, year=year_, songs=[])
            album_obj.url = url(album_obj.title)
            
            if tag['art']:
                album_obj.artworkurl = tag['art']

            song_obj = song.Song(title=title_, trackno=trackno_, length=tag['length'], filepath=path)
            song_obj.url = url(song_obj.title)
            
            album_obj.add_song(song_obj)
            artist_obj.add_album(album_obj)
            self.merge_artist(artist_obj)

            
    def __is_supported(self, filename):
        filename = filename.lower()
        for e in self.extensions:
            if filename.endswith('.' + e): return True
        return False
        
        
    def __scan(self, directory):
        for f in os.listdir(directory):
            fullpath = directory
            if not fullpath.endswith('/'): fullpath += '/'
            fullpath += f
            if f.startswith('.'): 
                continue
            elif os.path.isdir(fullpath):
                self.__scan(fullpath)
            elif self.__is_supported(f):
                self.files.append(fullpath)
    
    def scan(self):
        for d in self.directories:
            if os.path.isdir(d): self.__scan(d)
            
            
    def build_songs(self):
        def _cmp(a, b):
                c = os.path.getsize(a) - os.path.getsize(b)
                if c < 0: return -1
                if c > 0: return 1
                return 0

        artcache = {}

        for s in self.files:
            fref = tagpy.FileRef(s)
            tag = fref.tag()
            directory = os.path.dirname(s)
            
            art = artcache.get(directory, False)
            if art is False:
                images = []
                for f in os.listdir(directory):
                    for ext in ['jpg', 'jpeg', 'png']:
                        if f.endswith('.' + ext): images.append(directory + '/' + f)
                images.sort(_cmp)
                if images: art = images[0]
                else: art = None
                artcache[directory] = art

            data = {
                'artist': tag.artist,
                'album' : tag.album,
                'year' : tag.year,
                'title' : tag.title,
                'trackno': tag.track,
                'length' : fref.audioProperties().length,
                'art' : art
            }
            self.songs.append((s,  data))

import MySQLdb
class SQLCollection(Collection):
    
    
    def __connect(self):
        return MySQLdb.connect(user='root', passwd='', db='music', 
            unix_socket="/opt/lampp/var/mysql/mysql.sock", use_unicode=True)
            
    def empty(self):
        query = '''
            DELETE FROM songs;
            DELETE FROM albums;
            DELETE FROM artists;
        '''
        c = self.__connect()
        c.cursor().execute(query)
        c.commit()
        c.close()
    
    def get(self, artist_=None, album_=None, song_=None):
        query = 'SELECT * FROM artists '
        subs = []
        if artist_:
            query += '\nINNER JOIN albums ON albums.album_artist = artists.artist_id '
            if album_:
                query += '\n  AND albums.album_url=%s '
                subs += [album_]
                query += '\nINNER JOIN songs ON songs.song_album = albums.album_id '
                if song_:
                    query += '\n  AND songs.song_url=%s'
                    subs += [song_]
            query += 'WHERE artist_url=%s '
            subs += [artist_]
        connection = self.__connect()
        cursor = connection.cursor()
        r = cursor.execute(query, tuple(subs))
        
        for result in cursor.fetchall():
            d = {}
            for field, value in zip(cursor.description, result):
                d[field[0]] = value
            artist_obj = artist.Artist(name=d['artist_name'], albums=[])
            artist_obj.url = d['artist_url']
            if artist_:
                album_obj = album.Album(title=d['album_title'], year=d['album_year'], songs=[])
                album_obj.url = d['album_url']
                if album_:
                    song_obj = song.Song(title=d['song_title'], trackno=d['song_trackno'], length=d['song_length'], filepath=d['song_filepath'])
                    song_obj.url = d['song_url']
                    album_obj.add_song(song_obj)
                artist_obj.add_album(album_obj)
            self.merge_artist(artist_obj)
        return self.artists

    def write(self):
        # this is really bad
        
        connection = self.__connect()
        cursor = connection.cursor()
        
        connection.set_character_set('utf8')
        cursor.execute('SET NAMES utf8;')
        cursor.execute('SET CHARACTER SET utf8;')
        cursor.execute('SET character_set_connection=utf8;')
        
        for artist in self.artists:
            artist_id = artist.dbid
            if artist_id is None:
                cursor.execute('INSERT INTO artists(artist_name, artist_url) VALUES(%s, %s )',
                    (artist.name, artist.url)) 
                artist_id = cursor.lastrowid
                artist.dbid = artist_id
            else:
                cursor.execute('UPDATE artists SET artist_name=%s, artist_url=%s WHERE artist_id=%s', 
                    (artist.name, artist.url, artist_id))

            for album in artist.albums:
                album_id = album.dbid
                if album_id is None:
                    cursor.execute('''INSERT INTO albums(album_artist, 
                        album_title, album_year, album_url, album_artworkurl) VALUES(%s, %s, %s, %s, %s)''', 
                            (artist_id, album.title, album.year, album.url, album.artworkurl))
                    album_id = cursor.lastrowid
                    album.dbid = album_id
                else:
                    cursor.execute('''UPDATE albums SET album_artist=%s, 
                        album_title=%s,
                        album_year=%s
                        album_url=%s
                        WHERE album_id=%s''', (artist_id, album.title, album.year, album.url, album_id))

                for song in album.songs:
                    song_id = song.dbid
                    if song_id is None:
                        r = cursor.execute('''INSERT INTO songs(song_title, song_album, song_trackno, song_length, song_filepath, song_url)
                        VALUES(%s, %s, %s, %s, %s, %s)''', (song.title, album_id, song.trackno, song.length, song.filepath, song.url))
                        song.dbid = cursor.lastrowid
                    else:
                        cursor.execute('''UPDATE songs SET 
                        song_title=%s,
                        song_album=%s,
                        song_trackno=%s,
                        song_length=%s,
                        song_filepath=%s
                        song_url=%s
                        WHERE song_id=%s''', (song.title, song.album, song.trackno, song.length, song.filepath, song.url, song.dbid))
        connection.commit()
        connection.close()

if __name__ == '__main__':
    c = FSCollection('/mnt/storage/music')
    c.build_collection()
    c2 = SQLCollection()
    #c2.artists = c.artists
    #c2.write()
    print c2.get('amon-amarth')
