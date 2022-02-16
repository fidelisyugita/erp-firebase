const moment = require("moment");

exports.isSameDay = (date1, date2, format = "YYYY-MM-DD") => {
  return moment(date1, format).isSame(moment(date2, format), "d");
};
