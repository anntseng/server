/**
 * 打log
 * @param next
 */
module.exports = function*(next) {
  var start = new Date();

  yield next;

  var end = new Date();
  var color;

  switch ((this.status + "").charAt(0)) {
    case "2":
      color = "32";
      break;
    case "3":
      color = "33";
      break;
    default :
      color = "90";
      break;
  }

  console.log("\x1b[%sm%s %s %s   %s ms\x1b[0m", color, this.method, this.status, this.path, end - start);
};