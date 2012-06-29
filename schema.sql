CREATE TABLE IF NOT EXISTS `artists` (
    artist_id INT NOT NULL AUTO_INCREMENT,
    artist_name VARCHAR(1024),
    artist_url VARCHAR(1024),
    PRIMARY KEY(artist_id)
);

CREATE TABLE IF NOT EXISTS  `albums`  (
    album_id INT NOT NULL AUTO_INCREMENT,
    album_artist INT NOT NULL,
    album_title VARCHAR(1024),
    album_year INT,
    album_artworkurl VARCHAR(4096),
    album_url VARCHAR(1024),
    PRIMARY KEY(album_id),
    FOREIGN KEY(album_artist) REFERENCES `artists`(artist_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `songs`(
    song_id INT NOT NULL AUTO_INCREMENT,
    song_title VARCHAR(1024),
    song_album INT NOT NULL,
    song_trackno INT,
    song_length INT,
    song_filepath VARCHAR(4096),
    song_url VARCHAR(1024),
    PRIMARY KEY(song_id),
    FOREIGN KEY(song_album) REFERENCES `albums`(album_id) ON DELETE CASCADE
);