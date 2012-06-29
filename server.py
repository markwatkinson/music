import os

from flask import Flask, render_template, make_response, abort, send_file, request

from music import collection
from music import jsonencoder


app = Flask(__name__)

# pretty prints artists/albums/songs
# debugging only
def pretty_artists(artists):
    s = '<pre>'
    for artist in artists:
        s += 'Artist: ' + artist.name + '\n'
        s += 'Albums:\n'
        for album in artist.albums:
            s += '\t' + album.title + ':\n'
            for song in album.songs:
                s += '\t\t' + song.title + '\n'
    s += '</pre>'
    return s
    

def appdir(d=''):
    """ Return the directory of a subdir in the project"""
    p = os.path.dirname(os.path.realpath(__file__))
    if d and not p.endswith('/') and not d.startswith('/'): p += '/'
    p += d
    return p

@app.route('/')
def hello_world():
    return render_template('index.html')
    
@app.route('/get/')
@app.route('/get/<artist>/')
@app.route('/get/<artist>/<album>/')
@app.route('/get/<artist>/<album>/<song>/')
def get(artist=None, album=None, song=None):
    """ Get JSON information about the given artist/album/song """
    c = collection.SQLCollection()
    a = c.get(artist, album, song)
    return jsonencoder.encode_artists(a)
    
@app.route('/play/<artist>/<album>/<song>/')
def play(artist, album, song):
    """ Send the specified song """
    c = collection.SQLCollection()
    a = c.get(artist, album, song)
    try:
        song = a[0].albums[0].songs[0]
        path = song.filepath
        try:
            return send_file(path)
        except:
            abort(500)
    except:
        abort(404)


@app.route('/art/<artist>/<album>/')
@app.route('/art/<artist>/<album>/<song>')
def art(artist, album, song=None):
    """ Send the artwork for the given album """
    import hashlib
    
    c = collection.SQLCollection()
    a = c.get(artist, album)
    artpath = ''
    try:
        artpath = a[0].albums[0].artworkurl
    except:
        abort(404)

    size = int(request.args.get('s', 64))
    
    
    tmpdir = appdir('tmp/art/')
    tmpref = hashlib.md5(a[0].url + '/' + a[0].albums[0].url).hexdigest() + '_' + str(size)
    tmpref += '.jpg'
    if not os.path.exists(tmpdir):
        os.mkdir(tmpdir)
        
    if os.path.exists(tmpdir + tmpref): 
        return send_file(tmpdir + tmpref)
        
    if not artpath:
        tmpref = 'unknown_' + str(size) + '.jpg'
        artpath = appdir('/static/assets/unknowncover.jpg')
    import Image

    im = Image.open(artpath)
    sizetuple = size, size
    im.thumbnail(sizetuple, Image.ANTIALIAS)
    im.save(tmpdir + tmpref, 'JPEG', quality=100)
    return send_file(tmpdir + tmpref)

    
    
@app.route('/rescan')
def rescan():
    """ Fully rescans the collection """
    c = collection.FSCollection('/mnt/storage/music/')
    c.build_collection()
    c2 = collection.SQLCollection()
    c2.artists = c.artists
    c2.empty()
    c2.write()
    return 'ok'

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')