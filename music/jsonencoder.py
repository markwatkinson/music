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
                        'filePath' : s.filepath
                    }
                    songs.append(song)
                
                album = {
                    'title' : a.title,
                    'year' : a.year,
                    'artworkUrl' : a.artworkurl,
                    'songs' : songs
                }
                albums.append(album)
            return {
                'name' : obj.name,
                'albums' : albums
            }
        else: 
            return json.JSONEncoder.default(self, obj)

def encode_artists(artists):
    
    return json.dumps({'artists':artists}, cls=ArtistJSONEncoder)