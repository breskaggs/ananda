var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    bcrypt = require('bcrypt-nodejs'),
    SALT_WORK_FACTOR = 10;

var UserSchema = new Schema({
    email: { type: String, required: true, index: { unique: true } },
    password: { type: String, required: true },
    name: String
});

UserSchema.pre('save', function(next) {
    var user = this;

    // only hash the password if it has been modified (or is new)
    if (!user.isModified('password')) {return next();}

    // generate a salt
    bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
        if (err) {return next(err);}

        // hash the password using our new salt
        bcrypt.hash(user.password, salt, null,function(err, hash) {
            if (err) {return next(err);}

            // override the cleartext password with the hashed one
            user.password = hash;
            next();
        });
    });
});

UserSchema.statics.authenticate = function(un, pw, cb){
    this.model('User').findOne({email:un}, function(err, user){
        bcrypt.compare(pw, user.password, function(err, isMatch) {
            if (err) {return cb(err);}
            cb(null, isMatch);
        });
    });
};
module.exports = mongoose.model('User', UserSchema);
