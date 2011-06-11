# EagerFeet

This is the code that powers [eagerfeet.org](http://eagerfeet.org/), a website that extracts run data from Nike+ so that it can be imported into programs like [RunKeeper](http://runkeeper.com/).

## Dependencies

The server is written using [node.js](http://nodejs.org). It requires the following modules:

* [express](https://github.com/visionmedia/express)
* [node-xml](https://github.com/robrighter/node-xml)
* [xmlbuilder-js](https://github.com/oozcitak/xmlbuilder-js)
* [node-sqlite3](https://github.com/developmentseed/node-sqlite3)

## Database

The site now logs its data in a sqlite database called `runs.db` (user and run IDs are hashed for privacy). The statement to create the runs table in that database is:

````sql
CREATE TABLE "runs" (
	"runID" TEXT PRIMARY KEY ON CONFLICT REPLACE,
	"userID" TEXT,
	"date" TEXT,
	"latitude" REAL,
	"longitude" REAL,
	"distance" REAL DEFAULT 0
)
````

## License

This software is released under the [ISC License](http://www.opensource.org/licenses/isc-license), which is practically identical to the better-known MIT License, but uses simpler wording (see below).

The only exception is the header image, which contains an item I bought from [iStockphoto](http://www.istockphoto.com/), and which I therefore cannot release.

Also, please remove the tracking code at the end of the HTML file if you put it up somewhere else.

Copyright (c) 2011, Robert Kosara <rkosara@me.com>

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.