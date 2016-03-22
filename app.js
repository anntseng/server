/**
 * Created by AnnTseng on 2016/3/3.
 */
'use strict';

const fs = require('fs');
const koa = require('koa');
const router = require('koa-router')();
const route = require('./router');

const log = require('./log');
const app = koa();

app.use(log);
app.use(router.routes());
app.use(router.allowedMethods());

route(router);

app.use(function* () {
    this.state = 404;
    this.body = '404';
});

app.listen(3000);

console.log('listening port 3000...');