import json
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

# post request for information. This will typically be used to request multiple
# things at once. 
# At the moment we support a uids array where uid is a string passed to get()
# TODO support individual artist/album/song fields
@app.route('/gets/', methods=['POST'])
def gets():
    uids = json.loads(request.form.get('uids', '[]'))
    c = collection.SQLCollection()
    for uid in uids:
        s = uid.split('/')
        c.get(*s)
    return jsonencoder.encode_artists(c.artists)
    
    
def transcode(song):
    """ handles transcoding if necessary, returns the new path """
    
    path = song.filepath
    if path.endswith('.ogg'): return
    if path.endswith('.flac'):
        # there is a race condition here
        import subprocess
        newpath = appdir('tmp/ogg/' + song.album.artist.url + '/' +
            song.album.url  + '/' + song.url + '.ogg')
        song.filepath = newpath
        if os.path.exists(newpath): return
        
        
        flac = subprocess.Popen(['flac', '-d', '-c', path], stdout=subprocess.PIPE)
        ogg = subprocess.Popen(['oggenc', '-q', '5',
            '-N', str(song.trackno),
            '-l', song.album.title,
            '-a', song.album.artist.name,
            '-t', song.title,
            '-'], stdin=flac.stdout, stdout=subprocess.PIPE)
        try:
            os.makedirs(os.path.dirname(newpath))
        except: 
            pass
        with open(newpath, 'wb') as f:
            while True:
                d = ogg.stdout.read(1024*100)
                if not d: break
                f.write(d)
        song.filepath = newpath
    else:
        song.filepath = None


@app.route('/play/<artist>/<album>/<song>/')
def play(artist, album, song):
    """ Send the specified song """
    c = collection.SQLCollection()
    a = c.get(artist, album, song)
    try:
        song = a[0].albums[0].songs[0]
        
        try:
            print 'transcoding'
            transcode(song)
            print 'transcoded'
            return send_file(song.filepath)
        except Exception as e:
            raise
            print str(e)
            abort(500)
    except IndexError:
        abort(404)

@app.route('/search/<term>/')
def search(term):
    """ Search for a particular term """
    c = collection.SQLCollection()
    a = c.search(term.strip())
    return jsonencoder.encode_artists(a)

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


@app.route('/playlist/save/', methods=['POST'])
def playlist_save():
    """ Save a playlist.
        Request is handled as POST:
            playlist : json object
            name : string
    """
    playlist_json = request.form.get('playlist', None)
    playlist_name = request.form.get('name', None)
    if not playlist_json or not playlist_name: abort(400)
    path = appdir('persistent/playlists/' + playlist_name + '.json')
    with open(path, 'w') as f:
        f.write(playlist_json)
    return 'ok'
    
@app.route('/playlist/get/<name>')
def playlist_get(name):
    # TODO: index of all playlists
    return send_file(appdir('persistent/playlists/' + name + '.json'))


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