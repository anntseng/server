/**
 * Created by AnnTseng on 2016/3/3.
 */

'use strict';

const fs = require('fs');
const querystring = require('querystring');
const path = require('path');
const mimes = require('./mimes');
const fetch = require('node-fetch');
const mock = require('./mock');

var router;

module.exports = (r) => {
    router = r;

    pageRoute();

    proxyRoute();

};

/**
 * 页面路由
 */
function pageRoute(){

    // 获取页面路由文件
    var urlmap = fs.readFileSync("./urlmap").toString();

    // 过滤注释，多余的空行，并转成数组
    urlmap = urlmap.replace(/ *#.*(?:\r\n|\n)?/g, '').replace(/(\r?\n){2,}/g, '\n').split(/\r?\n/g);
    // 给urlmap添加页面映射
    urlmap.forEach((um) => {
        if (!um) return;

        var umkeys = um.split(/\s+/g, 2);
        // 添加路由配置
        router.get(umkeys[0], function *(next) {
            var result = yield output(umkeys[1], true);
            if (!result) yield next;
        });

    });


    router.get("**/*", function*(next) {
        //获取到目录结构
        var result = yield output('..' + this.path, false);
        if (!result) yield next;
    });


}

/**
 * 接口代理
 */
function proxyRoute(){
    router.all("*/:action", function*(next){
        var self = this;

        var action = self.params.action;
        var req = self.req;

        var result = yield new Promise(function(resolve){
            var chunks = [];
            var size = 0;

            req.on("data", function(chunk){
                chunks.push(chunk);
                size += chunk.length;
            });

            req.on("end", function(){
                resolve(Buffer.concat(chunks, size).toString())
            })
        });

        // 获取请求的数据
        if(self.method === "GET"){ //get方法简单粗暴地传递参数
            var _arr = self.url.split('?')[1],
                _data = {};

            if(!!_arr){
                _arr = _arr.split("&") || [];
                for(var i=0; i<_arr.length; i++){
                    _data[_arr[i].split('=')[0]] = _arr[i].split('=')[1];
                }
            }
            result = _data;
        }
        else{
            try{
                result = querystring.parse(result);
            }
            catch(e){
                result = {};
            }
        }

        var nresult = {};
        var key;

        for(var k in result){
            key = k.split(".");

            nresult[key[1]||key[0]] = result[k];
        }

        if(action in mock){
            var body = mock[action](nresult);
            if(body.delay){
                yield new Promise(function(resolve){
                    setTimeout(function(){
                        resolve();
                    }, body.delay)
                })
            }

            this.body = body;
        } else {
            yield next;
        }
    })
}

/**
 * 输出有效路径的文件
 * @param filePath
 * @param _isRoute boolean 标识是否做了映射
 * @returns {*}
 */
function output(filePath, _isRoute) {

    return function*() {
        // 获取文件mime，同时获取contentType
        var extIndex = mimes.indexOf(path.extname(filePath) || "null"),
            contentType = extIndex == -1 ? null : mimes[extIndex + 1];

        if (!contentType || !fs.existsSync(filePath)) return false;

        this.set({'Content-Type': contentType + ";charset=utf-8"});

        var body = fs.readFileSync(filePath).toString(),
            serverLayer = path.resolve(__dirname).split(path.sep).length;

        if(_isRoute){
            //对页面引用的 js 和 css 路径处理
            var layer = serverLayer - path.resolve(__dirname, this.path).split(path.sep).length;

            body = body.replace(/\<script.*src=\"(.*)\".*\>|seajs\.use\(\"(.*)\"\)|\<link.*href=\"(.*)\".*\>/ig, function (str, $1, $2, $3){
                var s = $1 || $2 || $3;
                return s.startsWith('../') ? (str.replace(s, './' + s.substr(layer * 3))) : str;
            });
        }

        // 输出文件
        this.body = body;

        return true;
    }
}