const moment = require("moment");
const { isNil } = require("ramda");

exports.isSameDay = (date1, date2, format = "YYYY-MM-DD") => {
  return moment(date1, format).isSame(moment(date2, format), "d");
};

exports.generateSku = (category = "", name = "", color = "", size = "") => {
  if (isNil(category) || isNil(name) || isNil(color)) return null;

  return `${String(category).slice(0, 3)}-${String(name + "*****")
    .trim()
    .slice(0, 5)}-${String(color).slice(0, 3)}-${String("00" + size).slice(
    -2
  )}`.toUpperCase();
};
