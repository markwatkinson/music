import json

from collection import datatypes

class ArtistJSONEncoder(json.JSONEncoder):
    
    def default(self, obj):
        if isinstance(obj, datatypes.Artist):
            albums = []
            for a in obj.get('albums'):
                songs = []
                for s in a.get('songs'):
                    song = {
                        'title' : s.get('title'),
                        'trackNo' : s.get('trackno'),
                        'length' : s.get('length'),
                        'url' : s.get('url')
                    }
                    songs.append(song)

                album = {
                    'title' : a.get('title'),
                    'year' : a.get('year'),
                    'songs' : songs,
                    'url' : a.get('url')
                }
                albums.append(album)
            data = {
                'name' : obj.get('name'),
                'albums' : albums,
                'url' : obj.get('url')
            }
            return data
        else: 
            return json.JSONEncoder.default(self, obj)

def encode_artists(artists):
    return json.dumps({'artists':artists}, cls=ArtistJSONEncoder)
