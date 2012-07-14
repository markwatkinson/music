import os

import sqlite3

from collection import Collection
import datatypes


class SQLCollection(Collection):
    
    connection = None
    
    def __init__(self):
        path = os.path.dirname(os.path.abspath(__file__)) +  '/../../'
        self.__path = os.path.abspath(path) + '/'
        
        self.__setup()
        self.connection = None
        self.artists = []
        
    def __connect(self):
        if self.connection is None:
            path = self.__path + 'database.db' 
            self.connection = sqlite3.connect(path)
            self.connection.text_factory = lambda x: unicode(x, 'utf-8', 'ignore')
        return self.connection

    def close(self):
        self.connection.commit()
        self.connection.close()
        self.connection = None

    def __setup(self):
        c = self.__connect()
        
        with open(self.__path + 'schema.sql') as f:
            c.cursor().executescript(f.read())


        
    def __strip_prefix(self, prefix, obj):
        r = {}
        for k in obj:
            if k.startswith(prefix):
                r[ k[len(prefix): ] ] = obj[k]
        return r

        
    def __build_result(self, cursor):
        for result in cursor.fetchall():
            d = {}
            for field, value in zip(cursor.description, result):
                # this gives us a nice map of field name => value
                d[field[0]] = value
            
            artist_data = self.__strip_prefix('artist_', d)
            album_data = self.__strip_prefix('album_', d)
            song_data = self.__strip_prefix('song_', d)
            artist = datatypes.Artist(artist_data)
            if album_data.keys():
                album = datatypes.Album(album_data)
                if song_data.keys():
                    song = datatypes.Song(song_data)
                    album.add_song(song)
                artist.add_album(album)
            self.merge_artist(artist)
        return self.artists

    def empty(self):
        query = '''
            DELETE FROM songs;
            DELETE FROM albums;
            DELETE FROM artists;
        '''
        c = self.__connect()
        c.cursor().executescript(query)
        self.close()

    def random_song(self, number=20):
        query = '''
            SELECT * FROM songs 
            INNER JOIN albums ON album_id = song_album
            INNER JOIN artists ON artist_id = album_artist
            ORDER BY RANDOM() LIMIT ?
        '''
        c = self.__connect()
        cu = c.cursor()
        cu.execute(query, (number,))
        r = self.__build_result(cu)
        self.close()
        return r


    def get(self, artist=None, album=None, song=None):
        print artist, album, song
        query = 'SELECT * FROM artists '
        subs = []
        if artist:
            query += '\nINNER JOIN albums ON albums.album_artist = artists.artist_id '
            if album:
                query += '\n  AND albums.album_url=? '
                subs += [album]
                query += '\nINNER JOIN songs ON songs.song_album = albums.album_id '
                if song:
                    query += '\n  AND songs.song_url=? '
                    subs += [song]
            query += 'WHERE artist_url=? '
            subs += [artist]
        connection = self.__connect()
        cursor = connection.cursor()
        cursor.execute(query, tuple(subs))
        r = self.__build_result(cursor)
        self.close()
        print r
        return r
        
    def search(self, term):
        connection = self.__connect()
        cursor = connection.cursor()
        
        # could we compress this into one query?
        # if the artist matches, we want all their albums and all their songs
        q1 = '''
            SELECT * FROM artists
            INNER JOIN albums ON albums.album_artist = artists.artist_id
            INNER JOIN songs ON songs.song_album = albums.album_id
            WHERE artist_name LIKE ?
        '''
        # if the album matches, we want the artist and the songs
        q2 = '''
            SELECT * FROM artists
            INNER JOIN albums ON albums.album_artist = artists.artist_id AND
                albums.album_title LIKE ?
            INNER JOIN songs ON songs.song_album = albums.album_id
        '''
        # if just a song matches, we want its album and artist
        q3 = '''
            SELECT * FROM artists
            INNER JOIN albums ON albums.album_artist = artists.artist_id
            INNER JOIN songs ON songs.song_album = albums.album_id AND
                songs.song_title LIKE ?
        '''
        for q in [q1, q2, q3]:
            t = ('%' + term + '%',)
            cursor.execute(q, t)
            self.__build_result(cursor)
        return self.artists
        
        
        
    def __write_song(self, song):
        connection = self.__connect()
        cursor = connection.cursor()
        
        properties = [song.get('album').dbid] + song.getl('title', 'trackno', 'length', 'filepath', 'url')
        
        if song.dbid is None:
            cursor.execute('''
                INSERT INTO songs(song_album, song_title, song_trackno, song_length, song_filepath, song_url)
                VALUES(?, ?, ?, ?, ?, ?)
            ''', tuple(properties))
            song.dbid = cursor.lastrowid
        else:
            cursor.execute('''
                UPDATE songs SET
                    song_album=?
                    song_title=?
                    song_trackno=?
                    song_length=?
                    song_filepath=?
                    song_url=?
                WHERE song_id=?
            ''', tuple(properties + [song.dbid]))


    def __write_album(self, album):
        connection = self.__connect()
        cursor = connection.cursor()
        properties = [album.get('artist').dbid] + album.getl('title', 'year', 'url', 'artworkurl')
        if album.dbid is None:
            cursor.execute('''
                INSERT INTO albums(album_artist, album_title, album_year, album_url, album_artworkurl)
                VALUES(?, ?, ?, ? ,?)
            ''', tuple(properties))
            album.dbid = cursor.lastrowid
        else:
            cursor.execute('''
                UPDATE albums SET 
                    album_artist=?,
                    album_title=?
                    album_year=?,
                    album_url=?,
                    album_artworkurl=?
                WHERE album_id=?
            ''', tuple(properties + [album.dbid]))
        for s in album.get('songs'):
            self.__write_song(s)

    def __write_artist(self, artist):
        connection = self.__connect()
        cursor = connection.cursor()
        if artist.dbid is None:
            cursor.execute('''
                INSERT INTO artists(artist_name, artist_url)
                VALUES(?, ?)
            ''', tuple(artist.getl('name', 'url')))
            artist.dbid = cursor.lastrowid
        else:
            cursor.execute('''
                UPDATE artists SET artist_name=?, artist_url=?
                WHERE artist_id=?
            ''', tuple(artist.getl('name', 'url')))

        
        for a in artist.get('albums'):
            self.__write_album(a)
    

    def write(self):
        for a in self.artists:
            self.__write_artist(a)
        connection = self.__connect()
        connection.commit()
        connection.close()