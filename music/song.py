class Song(object):
    
    def __init__(self, title='', album=None, trackno=None, length=None, filepath=None):
        self.title = title
        self.album = album
        self.trackno = trackno
        self.length = length
        self.filepath = filepath
        self.dbid = None
