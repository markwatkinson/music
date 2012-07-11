#!/usr/bin/env python
import sys

sys.path.insert(0, '..')

from lib.collection import datatypes


data = {
    'song' : {
        'title' : 'SongTitle',
        'trackno' : 54,
        'length' : 501,
        'filepath' : 'some/path',
    }, 
    'album' : {
        'title' : 'AlbumTitle',
        'year' : 1999,
        'artworkurl' : 'someurl'
    },
    'artist' : {
        'name' : 'ArtistName'
    }
}

song = datatypes.Song(data['song'])
assert song.get('title') == data['song']['title']
assert song.get('trackno') == data['song']['trackno']
assert song.get('length') == data['song']['length']
assert song.get('filepath') == data['song']['filepath']
assert song.get('url') == 'songtitle'

album = datatypes.Album(data['album'])
assert album.get('title') == data['album']['title']
assert album.get('year') == data['album']['year']
assert album.get('artworkurl') == data['album']['artworkurl']
assert album.get('url') == 'albumtitle'

artist = datatypes.Artist(data['artist'])
assert artist.get('name') == data['artist']['name']
assert artist.get('url') == 'artistname'

assert len(album.get('songs')) == 0
album.add_song(song)
assert len(album.get('songs')) == 1
assert album.get('songs')[0].get('title') == data['song']['title']
assert album.get('songs')[0].get('album') == album