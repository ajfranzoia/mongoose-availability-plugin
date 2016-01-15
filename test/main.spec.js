'use strict';

var mongoose    = require('mongoose'),
    should      = require('should'),
    async      = require('async'),
    availabilityPlugin = require('../lib/mongoose-available-plugin'),
    moment = require('moment'),
    Schema      = mongoose.Schema;


// Tests
// ------------------------------------------------------------
describe('Mongoose Validator:', function() {
  var schema, Agenda;

  before(function(done) {

    var url  = 'mongodb://127.0.0.1/mongoose_availability_plugin_test',
        date = Date.now();

    mongoose.connect(url);

    schema = new Schema({
      name: { type: String, required: true },
    });

    schema.plugin(availabilityPlugin);
    Agenda = mongoose.model('Agenda', schema);

    done();
  });

  after(function(done) {
    mongoose.connection.db.dropDatabase();
    mongoose.disconnect();
    done();
  });

  describe('Basic functionality', function() {
    it('should have basic properties', function(done) {
      var agenda = new Agenda({name: 'My agenda'});

      agenda.toObject().availability.should.deepEqual([]);
      agenda.toObject().unavailability.should.deepEqual([]);

      done();
    });

    it('should save availability/unavailability', function(done) {
      var agenda = new Agenda({name: 'My agenda'});

      async.series([
        function(cb) {
          agenda.addAvailability({
            type: 'weekday',
            shiftDuration: 20,
            options: {
              weekday: 'monday'
            },
            schedule: {
              from: '8:00',
              to: '12:00'
            },
          }, cb);
        },
        function(cb) {
          agenda.addAvailability({
            type: 'weekday',
            shiftDuration: 20,
            options: {
              day: 'wednesday'
            },
            schedule: {
              from: '9:00',
              to: '10:00'
            },
          }, cb);
        },
        function(cb) {
          agenda.addUnavailability({
            from: moment('2015-01-01'),
            to: moment('2015-01-01'),
          }, cb);
        }
      ], function(err, results) {
        if (err) return done(err);

        agenda = agenda.toObject();

        agenda.name.should.equal('My agenda');
        agenda.availability.length.should.equal(2);
        agenda.unavailability.length.should.equal(1);

        agenda.availability[0].should.have.property('_id');
        delete agenda.availability[0]._id;
        agenda.availability[0].should.deepEqual({
          type: 'weekday',
          shiftDuration: 20,
          options: {
            weekday: 'monday'
          },
          schedule: {
            from: '8:00',
            to: '12:00'
          },
        });

        agenda.availability[1].should.have.property('_id');
        delete agenda.availability[1]._id;
        agenda.availability[1].should.deepEqual({
          type: 'weekday',
          shiftDuration: 20,
          options: {
            day: 'wednesday'
          },
          schedule: {
            from: '9:00',
            to: '10:00'
          },
        });

        agenda.unavailability[0].should.have.property('_id');
        delete agenda.unavailability[0]._id;
        agenda.unavailability[0].should.deepEqual({
          from: moment('2015-01-01').toDate(),
          to: moment('2015-01-01').toDate(),
        });

        done();
      });
    });

    it('should remove availability/unavailability', function(done) {
      var agenda = new Agenda({name: 'My agenda'});

      async.series([
        function(cb) {
          agenda.addAvailability({
            type: 'weekday',
            shiftDuration: 20,
            options: {
              weekday: 'monday'
            },
            schedule: {
              from: '8:00',
              to: '12:00'
            },
          }, cb);
        },
        function(cb) {
          agenda.addUnavailability({
            from: moment('2015-01-01'),
            to: moment('2015-01-01')
          }, cb);
        },
        function(cb) {
          agenda.removeAvailability(agenda.availability[0]._id, cb);
        },
        function(cb) {
          agenda.removeUnavailability(agenda.unavailability[0]._id, cb);
        }
      ], function(err, results) {
        if (err) return done(err);

        agenda = agenda.toObject();

        agenda.availability.should.deepEqual([]);
        agenda.unavailability.should.deepEqual([]);

        done();
      });
    });

    it('should get basic schedule', function(done) {
      var agenda = new Agenda({name: 'My agenda'});

      agenda.addAvailability({
        type: 'weekday',
        shiftDuration: 20,
        options: {
          weekday: 'monday'
        },
        schedule: {
          from: '8:00',
          to: '9:20'
        },
      }, function(err, results) {
        if (err) return done(err);

        var options = {
          from: moment('2015-01-04'), // sunday
          to: moment('2015-01-06'), // tuesday
        };

        agenda.getSchedule(options).should.deepEqual([
          '2015-01-05 08:00:00',
          '2015-01-05 08:20:00',
          '2015-01-05 08:40:00',
          '2015-01-05 09:00:00'
        ]);

        done();
      });

    });

    it('should get schedule with more than one availability', function(done) {
      var agenda = new Agenda({name: 'My agenda'});

      agenda.addAvailability([
        {
          type: 'weekday',
          shiftDuration: 30,
          options: {
            weekday: 'tuesday'
          },
          schedule: {
            from: '10:00',
            to: '12:00'
          },
        },
        {
          type: 'weekday',
          shiftDuration: 20,
          options: {
            weekday: 'friday'
          },
          schedule: {
            from: '16:00',
            to: '17:00'
          },
        },
      ], function(err, results) {
        if (err) return done(err);

        var options = {
          from: moment('2016-01-04'), // monday
          to: moment('2016-01-08'), // friday
        };

        agenda.getSchedule(options).should.deepEqual([
          '2016-01-05 10:00:00',
          '2016-01-05 10:30:00',
          '2016-01-05 11:00:00',
          '2016-01-05 11:30:00',
          '2016-01-08 16:00:00',
          '2016-01-08 16:20:00',
          '2016-01-08 16:40:00',
        ]);

        done();
      });

    });

    it.only('should get schedule and apply validity', function(done) {
      var agenda = new Agenda({name: 'My agenda'});

      agenda.addAvailability({
        type: 'weekday',
        shiftDuration: 30,
        options: {
          weekday: 'tuesday'
        },
        schedule: {
          from: '10:00',
          to: '12:00'
        },
        validity: {
          from: '2016-01-01',
          to: '2016-01-31',
        }
      }, function(err, results) {
        if (err) return done(err);

        var options = {
          from: moment('2016-01-04'), // monday
          to: moment('2016-01-08'), // friday
        };

        agenda.getSchedule(options).should.deepEqual([
          '2016-01-05 10:00:00',
          '2016-01-05 10:30:00',
          '2016-01-05 11:00:00',
          '2016-01-05 11:30:00',
        ]);


        options = {
          from: moment('2016-01-04'), // monday
          to: moment('2016-01-14'), // friday
        };

        agenda.getSchedule(options).should.deepEqual([
          '2016-01-05 10:00:00',
          '2016-01-05 10:30:00',
          '2016-01-05 11:00:00',
          '2016-01-05 11:30:00',
          '2016-01-12 10:00:00',
          '2016-01-12 10:30:00',
          '2016-01-12 11:00:00',
          '2016-01-12 11:30:00',
        ]);


        options = {
          from: moment('2016-02-01'), // monday
          to: moment('2016-12-31'), // friday
        };

        agenda.getSchedule(options).should.deepEqual([]);

        done();
      });

    });

  });

});
