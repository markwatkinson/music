import json

import album, artist, song

class ArtistJSONEncoder(json.JSONEncoder):
    
    def default(self, obj):
        if isinstance(obj, artist.Artist):
            albums = []
            for a in obj.albums:
                songs = []
                for s in a.songs:
                    song = {
                        'title' : s.title,
                        'trackNo' : s.trackno,
                        'length' : s.length,
                        'url' : s.url
                    }
                    songs.append(song)

                album = {
                    'title' : a.title,
                    'year' : a.year,
                    'artworkUrl' : a.artworkurl,
                    'songs' : songs,
                    'url' : a.url
                }
                albums.append(album)
            return {
                'name' : obj.name,
                'albums' : albums,
                'url' : obj.url
            }
        else: 
            return json.JSONEncoder.default(self, obj)

def encode_artists(artists):
    
    return json.dumps({'artists':artists}, cls=ArtistJSONEncoder)