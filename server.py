import os

from flask import Flask, render_template, make_response, abort, send_file, request

from music import collection
from music import jsonencoder


app = Flask(__name__)


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
    
    
def appDir(d=''):
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
    c = collection.SQLCollection()
    a = c.get(artist, album, song)
    return jsonencoder.encode_artists(a)
    return pretty_artists(a)
    
@app.route('/play/<artist>/<album>/<song>/')
def play(artist, album, song):
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
    import hashlib
    
    c = collection.SQLCollection()
    a = c.get(artist, album)
    artpath = ''
    try:
        artpath = a[0].albums[0].artworkurl
    except:
        abort(404)
    print 'artpath' + artpath
    
    
    tmpdir = appDir('tmp/art/')
    tmpref = hashlib.md5(a[0].url + '/' + a[0].albums[0].url).hexdigest()
    tmpref += '.jpg'
    
    if not os.path.exists(tmpdir + tmpref):
        if not artpath: 
            abort(404)
        if not os.path.exists(tmpdir):
            os.mkdir(tmpdir)
        try:
            import Image
            im = Image.open(artpath)
            im.thumbnail((64, 64), Image.ANTIALIAS)
            im.save(tmpdir + tmpref, 'JPEG')
        except Exception as e:
            raise
            abort(500)
    return send_file(tmpdir + tmpref)
    
    
@app.route('/rescan')
def rescan():
    c = collection.FSCollection('/mnt/storage/music/')
    c.build_collection()
    c2 = collection.SQLCollection()
    c2.artists = c.artists
    c2.empty()
    c2.write()
    return 'ok'

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')