import mimetypes
import os
import re

from flask import request, send_file, Response

def send_file_partial(path):
    """ 
        Simple wrapper around send_file which handles HTTP 206 Partial Content
        (byte ranges)
        TODO: handle all send_file args, mirror send_file's error handling
        (if it has any)
    """
    
    # FIXME this breaks for Chrome. I don't know why. Chrome seems to 
    # cancel the request and then send another one, but we never see the 
    # second one. I don't know which part of the stack is to blame but I'm
    # pretty sure it's not us.
    # Chromium (18) seems to work though?
    
    range_header = request.headers.get('Range', None)
    if not range_header: return send_file(path)
    
    size = os.path.getsize(path)
    
    byte1, byte2 = 0, size
    m = re.search('(\d+)-(\d*)', range_header)    
    g = m.groups()
    
    if g[0]: byte1 = int(g[0])
    if g[1]: byte2 = int(g[1])
    data = None
    with open(path, 'rb') as f:
        f.seek(byte1)
        data = f.read(byte2 - byte1)
        
   
    rv = Response(data, 
        206, 
        mimetype=mimetypes.guess_type(path)[0], 
        direct_passthrough=True)
        
    rv.headers.add('Content-Range', 'bytes {0}-{1}/{2}'.format(byte1, byte2, size))
    return rv
    
    