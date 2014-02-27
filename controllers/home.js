var common = require('./common'),
    models = require("../models"),
    moment = require("moment");
var Page = common.Page,
    Q = common.Q;
module.exports = function (soap) {
    function landing(req, res) {
        var now = moment();
        if (now.add('minutes', -30).day() != moment().day())
            now.add('minutes', 30);
        var tmrw = moment(now).add('days', 1).endOf('day');
        var args = {
            Fields: [
                {
                    string: 'Classes.ClassDescription.Name'
                },
                {
                    string: 'Classes.StartDateTime'
                },
                {
                    string: 'Classes.Staff.Name'
                }
            ],
            StartDateTime: now.format('YYYY-MM-DD[T]HH:mm:ss'),
            EndDateTime: tmrw.format('YYYY-MM-DD[T]HH:mm:ss'),
            SchedulingWindow: true,
            XMLDetail: 'Bare'
        };
        var tmrwStart = tmrw.startOf('day');
        var tdayEnd = now.endOf('day');
        //get classes
        soap.q(soap.Classes, 'GetClasses', args)
            .done(function (result) {
                var classes = result[0].GetClassesResult.Classes.Class;
                var model = {
                    today: classes.filter(function (ele) {
                        var d = moment(ele.StartDateTime);
                        return d.isBefore(tmrwStart);
                    }),
                    tmrw: classes.filter(function (ele) {
                        return moment(ele.StartDateTime).isAfter(now.endOf('day'));
                    })
                };
                model.pm = now.hours() >= 16;
                res.render('landing.html', Page("Ananda Yoga", model));

            });
    }

    function instructors(req, res) {
        var args = {
            Fields: [
                {
                    string: 'Staff.Bio'
                },
                {
                    string: 'Staff.ImageURL'
                },
                {
                    string: 'Staff.Email'
                },
                {
                    string: 'Staff.Name'
                }
            ],
            XMLDetail: 'Bare'
        };
        soap.q(soap.Staff, 'GetStaff', args)
            .done(function (staff) {
                staff = staff[0].GetStaffResult.StaffMembers.Staff
                    .filter(function (staff) {
                        return staff.ID > 1; //they have weird testing data at lower ID
                    });
                staff.map(function (s, i) { //clear empty Bio's
                    s.Bio = (typeof s.Bio == 'object') ? '' : s.Bio;
                });
                var model = {};
                model.staff = staff;
                res.render('instructors.html', Page("Instructors | Ananda Yoga", model))
            });
    }

    function classes(req, res) {
        var args = {
            XMLDetail: 'Bare',
            Fields: [
                {
                    string: 'ClassDescriptions.ImageURL'
                },
                {
                    string: 'ClassDescriptions.Name'
                },
                {
                    string: 'ClassDescriptions.Description'
                },
                {
                    string: 'ClassDescriptions.Program.Name' //Needed for filter
                }
            ]
        };
        soap.q(soap.Classes, 'GetClassDescriptions', args)
            .done(function (classes) {
                classes = classes[0].GetClassDescriptionsResult.ClassDescriptions.ClassDescription
                    .filter(function (e) {
                        var n = e.Program.Name;
                        return n != 'Workshops' && n != "Special Events" && typeof e.Description === 'string';
                    });
                classes.map(function (o, i) {
                    o.Description = (typeof o.Description == 'object') ? '' : o.Description;
                });
                res.render('classes.html', Page("Classes", {
                    classes: classes
                }));
            });
    }

    function schedule(req, res) {
        var yesterday = moment().add('days', -1);
        var future = moment(yesterday).add('weeks', 2)
        var args = {
            StartDateTime: yesterday.format(soap.DateFormat),
            EndDateTime: future.format(soap.DateFormat),
            SchedulingWindow: true,
            XMLDetail: 'Bare',
            Fields: [
                {
                    string: 'Classes.Staff.Name'
                },
                {
                    string: 'Classes.ClassDescription.Name'
                },
                {
                    string: 'Classes.StartDateTime'
                },
                {
                    string: 'Classes.EndDateTime'
                }
            ]
        };
        soap.q(soap.Classes, 'GetClasses', args)
            .done(function (classes) {
                classes = classes[0].GetClassesResult.Classes.Class
                /*.sort(function (a, b) {
                    return a < b ? 1 : -1;
                }); */
                var model = {
                    classes: classes
                };
                res.render("schedule.html", Page("Schedule | Ananda Yoga", model));
            });
    }

    //exports
    var out = {};
    out.landing = landing;
    out.instructors = instructors;
    out.classes = classes;
    out.schedule = schedule;
    return out;
}