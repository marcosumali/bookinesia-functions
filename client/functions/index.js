require('dotenv').config()
const functions = require('firebase-functions');
const cors = require('cors')({origin: true});
const admin = require('firebase-admin');
const fs = require('fs')
const nodemailer = require('nodemailer');
const sgTransport = require('nodemailer-sendgrid-transport');
const handlebars = require('handlebars');

const { formatMoney, getTotalTransaction } = require('./helpers/currency');
const { returnWhatDay, returnWhatMonth } = require('./helpers/date');

const AUTH_USERNAME = process.env.SENDGRID_USERNAME
const AUTH_PASS = process.env.SENDGRID_PASS
const AUTO_EMAIL = process.env.EMAIL_AUTOMATED
const REGISTER_EMAIL = fs.readFileSync(__dirname + '/nodemailer/templates/welcome.customer.html', 'utf-8')
const SHOP_SKIP_EMAIL = fs.readFileSync(__dirname + '/nodemailer/templates/shop.skip.transaction.html', 'utf-8')
const SHOP_QUEUE_REMINDER_EMAIL = fs.readFileSync(__dirname + '/nodemailer/templates/shop.queue.reminder.html', 'utf-8')
const SHOP_FINISH_TRANSACTION = fs.readFileSync(__dirname + '/nodemailer/templates/shop.finish.transaction.html', 'utf-8')
const SHOP_ADD_TRANSACTION = fs.readFileSync(__dirname + '/nodemailer/templates/shop.add.transaction.html', 'utf-8')

admin.initializeApp(functions.config().firebase);

exports.getUserBasedOnUid = functions.https.onRequest((req, res) => {
  // Put this line to your function
  // Automatically allow cross-origin requests
  cors(req, res, () => {
    let uid = req.body.uid
  
    admin.auth().getUser(uid)
    .then(function(userRecord) {
      let userData = userRecord.toJSON() 
      let user = {
        id: userData.uid,
        email: userData.email,
        name: userData.displayName,
      }
      res.status(200).json({
        message: 'Get user based on UID successful',
        user
      })
    })
    .catch(function(error) {
      console.log("ERROR: fetching user data by UID", error)
      res.status(400).json({
        message: 'ERROR: fetching user data by UID',
        error
      })
    })
  })
})


exports.getUserBasedOnEmail = functions.https.onRequest((req, res) => {
  cors(req, res, () => {
    let email = req.body.email
  
    admin.auth().getUserByEmail(email)
    .then(function(userRecord) {
      let userData = userRecord.toJSON()
      let user = {
        id: userData.uid,
        email: userData.email,
        name: userData.displayName,
      }
      res.status(200).json({
        message: 'Get user based on email successful',
        user,
      })
    })
    .catch(function(error) {
      console.log("ERROR: fetching user data by Email", error)
      res.status(400).json({
        message: 'ERROR: fetching user data by Email',
        error
      })
    })
  })
})


exports.getUserBasedOnPhone = functions.https.onRequest((req, res) => {
  cors(req, res, () => {
    let phone = req.body.phone
  
    admin.auth().getUserByPhoneNumber(phone)
    .then(function(userRecord) {
      let userData = userRecord.toJSON()
      let user = {
        id: userData.uid,
        email: userData.email,
        name: userData.displayName,
      }
      res.status(200).json({
        message: 'Get user based on phone successful',
        user,
      })
    })
    .catch(function(error) {
      console.log("ERROR: fetching user data by Phone", error)
      res.status(400).json({
        message: 'ERROR: fetching user data by Phone',
        error
      })
    })
  })
})


exports.adminUpdateUserProfile = functions.https.onRequest((req, res) => {
  cors(req, res, () => {
    let uid = req.body.uid
    let phone = req.body.phone
  
    admin.auth().updateUser(uid, {
      phoneNumber: phone,
    })
    .then(function(userRecord) {
      let userData = userRecord.toJSON()
      let user = {
        id: userData.uid,
        email: userData.email,
        name: userData.displayName,
        phone: userData.phoneNumber,
      }
      res.status(200).json({
        message: 'Update user profile successful',
        user,
        phone
      })
    })
    .catch(function(error) {
      console.log("ERROR: update user profile", error)
      res.status(400).json({
        message: 'ERROR: update user profile',
        error,
        phone
      })
    })
  })
})


exports.sendEmailWelcomeCustomer = functions.https.onRequest((req, res) => {
  cors(req, res, () => {})

  let customerName = req.body.name
  let customerNameCapitalize = customerName.charAt(0).toUpperCase() + customerName.slice(1)
  let customerEmail = req.body.email

  let emailTemplate = REGISTER_EMAIL

  // setting up email with data in handlebars
  let template = handlebars.compile(emailTemplate)
  let data = { 'name': customerNameCapitalize }
  let templateWithData = template(data)

  // setup email data with unicode symbols
  let mailOptions = {
    from: `"Bookinesia" ${AUTO_EMAIL}`,
    to: customerEmail,
    subject: `Welcome To Bookinesia, ${data.name}`, 
    html: `${templateWithData}`
  }

  // send mail with defined transport object
  let options = {
    auth: {
      api_user: `${AUTH_USERNAME}`,
      api_key: `${AUTH_PASS}`
    }
  }
  
  let client = nodemailer.createTransport(sgTransport(options))

  client.sendMail(mailOptions, function(err, info){
    if (err){
      console.log('ERROR: Customer Welcome Message not sent ', err)
      res.status(400).json({
        message: 'ERROR: Customer Welcome Message not sent',
        err,
      })    
    }
    else {
      // console.log(`Customer Welcome Message sent`, info.message)
      res.status(200).json({
        message: 'Customer Welcome Message is sent',
        messageInfo: info.message
      })    
    }
  })
})


exports.sendEmailShopSkipTransaction = functions.https.onRequest((req, res) => {
  cors(req, res, () => {})

  let customerName = req.body.name
  let customerEmail = req.body.email
  let transactionId = req.body.transactionId
  let date = req.body.date
  let newDate = `${returnWhatDay(Number(new Date(date).getDay()))}, ${new Date(date).getDate()} ${returnWhatMonth(Number(new Date(date).getMonth()))} ${new Date(date).getFullYear()}` 
  
  let shopName = req.body.shopName
  let shopLogo = req.body.shopLogo
  let branchName = req.body.branchName
  let queueNo = req.body.queueNo
  let staffName = req.body.staffName
  let staffImage = req.body.staffImage
  let phone = req.body.phone

  let emailTemplate = SHOP_SKIP_EMAIL

  // setting up email with data in handlebars
  let template = handlebars.compile(emailTemplate)
  let data = { 
    'name': customerName,
    'transactionId': transactionId,
    'date': newDate,
    'shopName': shopName,
    'shopLogo': shopLogo,
    'branchName': branchName,
    'queueNo': queueNo,
    'staffName': staffName,
    'staffImage': staffImage,
    'phone': phone,
  }
  let templateWithData = template(data)

  // setup email data with unicode symbols
  let mailOptions = {
    from: `"Bookinesia" ${AUTO_EMAIL}`,
    to: customerEmail,
    subject: `Bookinesia Notification: Your queue number has been skipped !`, 
    html: `${templateWithData}`
  }

  // send mail with defined transport object
  let options = {
    auth: {
      api_user: `${AUTH_USERNAME}`,
      api_key: `${AUTH_PASS}`
    }
  }
  
  let client = nodemailer.createTransport(sgTransport(options))

  client.sendMail(mailOptions, function(err, info){
    if (err){
      console.log('ERROR: Shop Skip Transaction Message not sent ', err)
      res.status(400).json({
        message: 'ERROR: Shop Skip Transaction Message not sent',
        err,
      })    
    }
    else {
      // console.log(`Shop Skip Transaction Message sent`, info.message)
      res.status(200).json({
        message: 'Shop Skip Transaction Message is sent',
        messageInfo: info.message
      })    
    }
  })
})


exports.sendEmailQueueReminder = functions.https.onRequest((req, res) => {
  cors(req, res, () => {})

  let customerName = req.body.name
  let customerEmail = req.body.email
  let transactionId = req.body.transactionId
  let date = req.body.date
  let newDate = `${returnWhatDay(Number(new Date(date).getDay()))}, ${new Date(date).getDate()} ${returnWhatMonth(Number(new Date(date).getMonth()))} ${new Date(date).getFullYear()}` 
  
  let shopName = req.body.shopName
  let shopNames = shopName.split(' ')
  let shopNamesCapitalize = []
  shopNames && shopNames.map(shopWord => {
    let capitalizeWord = shopWord.charAt(0).toUpperCase() + shopWord.slice(1)
    shopNamesCapitalize.push(capitalizeWord)
  })
  let shopNameCapitalize = shopNamesCapitalize.join(" ")
  let shopLogo = req.body.shopLogo
  
  let branchName = req.body.branchName
  let branchNames = branchName.split(' ')
  let branchNamesCapitalize = []
  branchNames && branchNames.map(branchWord => {
    let capitalizeWord = branchWord.charAt(0).toUpperCase() + branchWord.slice(1)
    branchNamesCapitalize.push(capitalizeWord)
  })
  let branchNameCapitalize = branchNamesCapitalize.join(" ")
  
  let queueNo = req.body.queueNo
  let staffName = req.body.staffName
  let staffImage = req.body.staffImage
  let currentQueue = req.body.currentQueue
  let text = req.body.text
  let category = req.body.category

  let emailTemplate = SHOP_QUEUE_REMINDER_EMAIL

  // setting up email with data in handlebars
  let template = handlebars.compile(emailTemplate)
  let data = { 
    'name': customerName,
    'transactionId': transactionId,
    'date': newDate,
    'shopName': shopName,
    'shopLogo': shopLogo,
    'branchName': branchName,
    'queueNo': queueNo,
    'staffName': staffName,
    'staffImage': staffImage,
    'currentQueue': currentQueue,
    'text': text,
    'category': category,
  }
  let templateWithData = template(data)

  // setup email data with unicode symbols
  let mailOptions = {
    from: `"Bookinesia" ${AUTO_EMAIL}`,
    to: customerEmail,
    subject: `Bookinesia Reminder: Your ${category} appointment on ${new Date(date).toDateString()} at ${shopNameCapitalize}, ${branchNameCapitalize}`, 
    html: `${templateWithData}`
  }

  // send mail with defined transport object
  let options = {
    auth: {
      api_user: `${AUTH_USERNAME}`,
      api_key: `${AUTH_PASS}`
    }
  }
  
  let client = nodemailer.createTransport(sgTransport(options))

  client.sendMail(mailOptions, function(err, info){
    if (err){
      console.log('ERROR: Reminder Message not sent', err)
      res.status(400).json({
        message: 'ERROR: Reminder Message not sent',
        err,
      })    
    }
    else {
      // console.log(`Reminder Message is sent`, info.message)
      res.status(200).json({
        message: 'Reminder Message is sent',
        messageInfo: info.message
      })    
    }
  })
})


exports.sendEmailTransactionReceipt = functions.https.onRequest((req, res) => {
  cors(req, res, () => {})

  let customerName = req.body.name
  let customerEmail = req.body.email
  let transactionId = req.body.transactionId
  
  let date = req.body.date
  let newDate = `${returnWhatDay(Number(new Date(date).getDay()))}, ${new Date(date).getDate()} ${returnWhatMonth(Number(new Date(date).getMonth()))} ${new Date(date).getFullYear()}` 
  
  let shopName = req.body.shopName
  let shopNames = shopName.split(' ')
  let shopNamesCapitalize = []
  shopNames && shopNames.map(shopWord => {
    let capitalizeWord = shopWord.charAt(0).toUpperCase() + shopWord.slice(1)
    shopNamesCapitalize.push(capitalizeWord)
  })
  let shopNameCapitalize = shopNamesCapitalize.join(" ")
  let shopLogo = req.body.shopLogo
  
  let branchName = req.body.branchName
  let branchNames = branchName.split(' ')
  let branchNamesCapitalize = []
  branchNames && branchNames.map(branchWord => {
    let capitalizeWord = branchWord.charAt(0).toUpperCase() + branchWord.slice(1)
    branchNamesCapitalize.push(capitalizeWord)
  })
  let branchNameCapitalize = branchNamesCapitalize.join(" ")
  
  let queueNo = req.body.queueNo
  let staffName = req.body.staffName
  let staffImage = req.body.staffImage
  let services = req.body.service
  
  let currency = ''
  let monetisedServices = []
  services && services.map((service) => {
    let newService = {
      name: service.name,
      description: service.description,
      currency: service.currency,
      price: formatMoney(service.price)
    }
    currency = service.currency
    monetisedServices.push(newService)
  })

  let totalAmount = formatMoney(getTotalTransaction(services))

  let emailTemplate = SHOP_FINISH_TRANSACTION

  // setting up email with data in handlebars
  let template = handlebars.compile(emailTemplate)
  let data = { 
    'name': customerName,
    'transactionId': transactionId,
    'date': newDate,
    'shopName': shopName,
    'shopLogo': shopLogo,
    'branchName': branchName,
    'queueNo': queueNo,
    'staffName': staffName,
    'staffImage': staffImage,
    'services': monetisedServices,
    'totalAmount': totalAmount,
    'currency': currency
  }
  let templateWithData = template(data)

  // setup email data with unicode symbols
  let mailOptions = {
    from: `"Bookinesia" ${AUTO_EMAIL}`,
    to: customerEmail,
    subject: `Bookinesia transaction receipt at ${shopNameCapitalize}, ${branchNameCapitalize} on ${new Date(date).toDateString()}`, 
    html: `${templateWithData}`
  }

  // send mail with defined transport object
  let options = {
    auth: {
      api_user: `${AUTH_USERNAME}`,
      api_key: `${AUTH_PASS}`
    }
  }

  let client = nodemailer.createTransport(sgTransport(options))

  client.sendMail(mailOptions, function(err, info){
    if (err){
      console.log('ERROR: Shop Finish Transaction Message not sent', err)
      res.status(400).json({
        message: 'ERROR: Shop Finish Transaction Message not sent',
        err,
      })    
    }
    else {
      // console.log(`Shop Finish Transaction Message is sent`, info.message)
      res.status(200).json({
        message: 'Shop Finish Transaction Message is sent',
        messageInfo: info.message
      })    
    }
  })
})


exports.sendEmailBookTransaction = functions.https.onRequest((req, res) => {
  cors(req, res, () => {})

  let customerName = req.body.name
  let customerEmail = req.body.email
  let transactionId = req.body.transactionId
  let date = req.body.date
  let newDate = `${returnWhatDay(Number(new Date(date).getDay()))}, ${new Date(date).getDate()} ${returnWhatMonth(Number(new Date(date).getMonth()))} ${new Date(date).getFullYear()}` 
  
  let shopName = req.body.shopName
  let shopNames = shopName.split(' ')
  let shopNamesCapitalize = []
  shopNames && shopNames.map(shopWord => {
    let capitalizeWord = shopWord.charAt(0).toUpperCase() + shopWord.slice(1)
    shopNamesCapitalize.push(capitalizeWord)
  })
  let shopNameCapitalize = shopNamesCapitalize.join(" ")
  let shopLogo = req.body.shopLogo
  
  let branchName = req.body.branchName
  let branchNames = branchName.split(' ')
  let branchNamesCapitalize = []
  branchNames && branchNames.map(branchWord => {
    let capitalizeWord = branchWord.charAt(0).toUpperCase() + branchWord.slice(1)
    branchNamesCapitalize.push(capitalizeWord)
  })
  let branchNameCapitalize = branchNamesCapitalize.join(" ")
  
  let queueNo = req.body.queueNo
  let staffName = req.body.staffName
  let staffImage = req.body.staffImage

  let emailTemplate = SHOP_ADD_TRANSACTION

  // setting up email with data in handlebars
  let template = handlebars.compile(emailTemplate)
  let data = { 
    'name': customerName,
    'transactionId': transactionId,
    'date': newDate,
    'shopName': shopName,
    'shopLogo': shopLogo,
    'branchName': branchName,
    'queueNo': queueNo,
    'staffName': staffName,
    'staffImage': staffImage,
  }
  let templateWithData = template(data)

  // setup email data with unicode symbols
  let mailOptions = {
    from: `"Bookinesia" ${AUTO_EMAIL}`,
    to: customerEmail,
    subject: `Bookinesia queue receipt for an appointment on ${new Date(date).toDateString()} at ${shopNameCapitalize}, ${branchNameCapitalize}`, 
    html: `${templateWithData}`
  };

  // send mail with defined transport object
  let options = {
    auth: {
      api_user: `${AUTH_USERNAME}`,
      api_key: `${AUTH_PASS}`
    }
  }
  
  let client = nodemailer.createTransport(sgTransport(options))

  client.sendMail(mailOptions, function(err, info){
    if (err){
      console.log('ERROR: Booking Receipt Message not sent', err)
      res.status(400).json({
        message: 'ERROR: Booking Receipt Message not sent',
        err,
      })    
    }
    else {
      // console.log(`Booking Receipt Message is sent`, info.message)
      res.status(200).json({
        message: 'Booking Receipt Message is sent',
        messageInfo: info.message
      })    
    }
  })
})