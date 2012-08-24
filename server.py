import config
import json
import os
import re

from flask import Flask, render_template, make_response, abort, request

from lib.collection import sqlcollection, fscollection
from lib import jsonencoder
from lib.http import send_file_partial

import subprocess


app = Flask(__name__)


transcodable_to_ogg = {
    'mp3' : False,
    'flac' : False,
    'ogg' : True,
}

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
    c = sqlcollection.SQLCollection()
    a = c.get(artist, album, song)
    return jsonencoder.encode_artists(a)

# post request for information. This will typically be used to request multiple
# things at once. 
# At the moment we support a uids array where uid is a string passed to get()
# TODO support individual artist/album/song fields
@app.route('/gets/', methods=['POST'])
def gets():
    uids = request.form.get('uids', None)
    c = sqlcollection.SQLCollection()
    if uids:
        for uid in json.loads(uids):
            s = uid.split('/')
            c.get(*s)
        return jsonencoder.encode_artists(c.artists)
    
    random = request.form.get('random', False)
    # random songs
    if random:
        number = json.loads(request.form.get('number', '20'))
        c.random_song(number)
        return jsonencoder.encode_artists(c.artists)
    
    else:
        print 'unhandled post request'
        print request.form.keys()
    
    
def transcode(song):
    """ handles transcoding if necessary, returns the new path """
    
    path = song.get('filepath')
    if path.endswith('.ogg'): return
    if path.endswith('.flac'):
        assert transcodable_to_ogg['flac']
        # there is a race condition here
        newpath = appdir('tmp/ogg/' + song.full_url() + '.ogg')
        song.set_val('filepath', newpath)
        if os.path.exists(newpath): return
        
        
        flac = subprocess.Popen(['flac', '-d', '-c', path], stdout=subprocess.PIPE)
        ogg = subprocess.Popen(['oggenc', '-q', '5',
            '-N', str(song.get('trackno')),
            '-l', song.get('album').get('title'),
            '-a', song.get('album').get('artist').get('name'),
            '-t', song.get('title'),
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
        song.set_val('filepath', newpath)
    else:
        song.set_val('filepath', None)


@app.route('/play/<artist>/<album>/<song>')
@app.route('/play/<artist>/<album>/<song>/')
def play(artist, album, song):
    """ Send the specified song """
    print 'Play!'
    c = sqlcollection.SQLCollection()
    a = c.get(artist, album, song)
    try:
        album = a[0].get('albums')[0]
        song = album.get('songs')[0]
    except IndexError:
        abort(403)
    try:
        transcode(song)
        return send_file_partial(song.get('filepath'))
    except Exception as e:
        raise
        print str(e)
        abort(500)


@app.route('/search/<term>/')
def search(term):
    """ Search for a particular term """
    c = sqlcollection.SQLCollection()
    a = c.search(term.strip())
    return jsonencoder.encode_artists(a)

@app.route('/art/<artist>/<album>/')
@app.route('/art/<artist>/<album>/<song>')
def art(artist, album, song=None):
    """ Send the artwork for the given album """
    import hashlib
    
    c = sqlcollection.SQLCollection()
    a = c.get(artist, album)
    artpath = ''
    try:
        album = a[0].get('albums')[0]
        artpath = album.get('artworkurl')
    except:
        abort(404)

    size = int(request.args.get('s', 64))
    
    
    tmpdir = appdir('tmp/art/')
    tmpref = hashlib.md5(album.full_url()).hexdigest() + '_' + str(size)
    tmpref += '.jpg'
    if not os.path.exists(tmpdir):
        os.mkdir(tmpdir)
        
    if os.path.exists(tmpdir + tmpref): 
        return send_file_partial(tmpdir + tmpref)
        
    if not artpath:
        tmpref = 'unknown_' + str(size) + '.jpg'
        artpath = appdir('/static/assets/unknowncover.jpg')
    import Image

    im = Image.open(artpath)
    sizetuple = size, size
    im.thumbnail(sizetuple, Image.ANTIALIAS)
    im.save(tmpdir + tmpref, 'JPEG', quality=100)
    return send_file_partial(tmpdir + tmpref)

def valid_playlist_name(name):
    return re.match('^[a-zA-Z0-9_\- ]+$', name) is not None

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
    if not valid_playlist_name(playlist_name): abort(400)
    path = appdir('persistent/playlists/' + playlist_name + '.json')
    with open(path, 'w') as f:
        f.write(playlist_json.encode('utf-8'))
    return 'ok'

@app.route('/playlist/get/')
@app.route('/playlist/get/<name>')
def playlist_get(name=None):
    if name is not None:
        try:
            if not valid_playlist_name(name):
                raise Exception
            return send_file_partial(appdir('persistent/playlists/' + name + '.json'))
        except:
            abort(404)
    else:
        #index
        files = os.listdir(appdir('persistent/playlists/'))
        playlists = []
        for f in files: 
            if f.startswith('.'): continue
            if f.endswith('.json'):
                playlists.append(f[:-5])
        return json.dumps(playlists)

@app.route('/rescan')
def rescan():
    """ Fully rescans the collection """
    
    c = fscollection.FSCollection(config.collection_path)
    if transcodable_to_ogg['mp3'] : c.extensions.append('mp3')
    if transcodable_to_ogg['flac'] : c.extensions.append('flac')
    c.build()
    c2 = sqlcollection.SQLCollection()
    c2.empty()    
    c2.artists = c.artists
    c2.write()
    return 'ok'

@app.after_request
def after_request(response):
    response.headers.add('Accept-Ranges', 'bytes')
    return response
    
if __name__ == '__main__':

    paths = ['tmp', 'tmp/art', 'tmp/ogg']
    for p in paths:
        try:
            os.mkdir(appdir(p))
        except:
            pass

    # going to figure out transcoding
    try:
        # if we can't transcode to ogg then we might as well give up now
        subprocess.call(['oggenc'], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        try:
            transcodable_to_ogg['flac'] = True
            subprocess.call(['flac'], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        except OSError:
            print 'Warning: cannot transcode from FLAC (cannot find flac command)'
            transcodable_to_ogg['flac'] = False
    except OSError:
        print 'Warning: cannot transcode to Ogg (cannot find oggenc command)'

    

    app.run(debug=True, host='0.0.0.0')
