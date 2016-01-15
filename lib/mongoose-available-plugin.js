'use strict';

/*
 * @list dependencies
 */

var mongoose = require('mongoose'),
  moment = require('moment'),
  Schema = mongoose.Schema;

require('moment-range');

/**
 * type = weekday | customRange
 * type:weekday =>
 *   options:
 *     repeat = weekly | 2weeks | customWeek
 */

var availabilitySchema = new Schema({
  type: {
    type: String,
    required: true
  },
  shiftDuration: {
    type: Number,
    required: true
  },
  options: Schema.Types.Mixed,
  schedule: {
    from: {
      type: String,
      required: true
    },
    to: {
      type: String,
      required: true
    }
  },
  validity: {
    from: Date,
    to: Date
  }
});

var unavailabilitySchema = new Schema({
  reason: String,
  from: {
    type: Date,
    required: true
  },
  to: {
    type: Date,
    required: true
  }
});

function makeAvailabilityReady(schema, options) {

  schema.add({
    availability: [availabilitySchema],
    unavailability: [unavailabilitySchema],
  });

  schema.methods.addAvailability = function(data, cb) {
    if (!Array.isArray(data)) {
      data = [data];
    }
    this.availability = this.availability.concat(data);
    this.save(cb);
  };

  schema.methods.removeAvailability = function(id, cb) {
    this.availability.id(id).remove();
    this.save(cb);
  };

  schema.methods.addUnavailability = function(data, cb) {
    if (!Array.isArray(data)) {
      data = [data];
    }
    this.unavailability = this.unavailability.concat(data);
    this.save(cb);
  };

  schema.methods.removeUnavailability = function(id, cb) {
    this.unavailability.id(id).remove();
    this.save(cb);
  };

  schema.methods.getSchedule = function(options) {
    var schedule = [];

    var schedulePeriods = [];

    var periodDates = [];

    moment.range(options.from, options.to).by('days', function(moment) {
      periodDates.push(moment);
    });

    this.availability.forEach(function(av) {
      if (!isValidAvailabilityForPeriod(av, options.from, options.to)) {
        return;
      }

      if (av.type === 'weekday') {
        periodDates.forEach(function(date) {
          // Check if set weekday option matches date weekday
          if (date.format('dddd').toLowerCase() !== av.options.weekday) {
            return;
          }

          if (av.options.repeat !== 'weekly') {

            // Repeats every two weeks
            if (av.options.repeat === '2weeks') {
              if (!av.validity || !av.validity.from) {
                throw new Error('Missing validity.from option when options.repeat is 2weeks');
              }

              var validityFrom = moment(av.validity.from);
              date.diff(validityFrom);

            } else if (av.options.repeat === 'customWeek') {

            }

          }

          // Iterate initial hour and collect shifts
          var from = moment(av.schedule.from, 'HH:mm');
          var to = moment(av.schedule.to, 'HH:mm');
          while (from < to) {
            schedule.push(date.format('YYYY-MM-DD') + ' ' + moment(from).format('HH:mm:ss'));
            from.add(av.shiftDuration, 'minutes');
          }
        });

      }

      schedulePeriods.push({

      });
    });

    return schedule;

    var shifts = generateShifts(options.from, options.to);

    function isValidAvailabilityForPeriod(availability, from, to) {
      if (availability.validity) {
        if (availability.validity.from && availability.validity.from > options.to) {
          return false;
        }

        if (availability.validity.to && availability.validity.to < options.from) {
          return false;
        }
      }

      return true;
    }
  };

}

module.exports = makeAvailabilityReady;


/*
var check = validator
  .isObject()
  .withRequired('status', validator.isBoolean())
  .withRequired('type', validator.isIsoDate())
  .withRequired('schedule', validator.isIsoDate())
  .withOptional('type', validator.isIsoDate())
*/
