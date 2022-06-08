#!/bin/sh

NPM="$HOST_DIR/usr/bin/node $HOST_DIR/usr/bin/npm"

cd $1/var/www
$NPM ci --production

exit 0
