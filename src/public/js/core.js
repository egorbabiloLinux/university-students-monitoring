document.addEventListener('DOMContentLoaded', () => {
	var user = jQuery('#user')
	var loginWindow = jQuery('#login')
	var loginEmail = jQuery('#email')
	var loginPassword = jQuery('#password')
	var confirmationPassword = jQuery('#confirmationPassword')
	var pageLogin = jQuery('#pageLogin')
	var pageRegister = jQuery('#pageRegister')
	var confirmationPasswordDiv = jQuery('#confirmationPasswordDiv')
	var loginMsg = jQuery(jQuery('.msg', loginWindow)[0])
	var stayOnline = jQuery('#stayOnline')
	confirmationPasswordDiv.hide()
	loginMsg.hide()

	confirmationPassword.keypress(inputKeyPress)
	loginPassword.keypress(inputKeyPress)
	loginEmail.keypress(inputKeyPress)
	user.click(function () {
		loginWindow.fadeIn('fast')
	})
	jQuery('#loginCancel').click(function () {
		hideWindow()
	})
	jQuery('#loginSbmt').click(function () {
		var isLogin = pageLogin.hasClass('active')
		var error = false
		var errorMsg = ''
		if (loginEmail.val() === '') {
			error = true
			loginEmail.addClass('error')
			errorMsg += 'Type your email'
		} else loginEmail.removeClass('error')
		if (!isLogin) {
			if (loginPassword.val() === '') {
				error = true
				loginPassword.addClass('error')
				errorMsg += '<br/>Type your password'
			} else loginPassword.removeClass('error')
			if (confirmationPassword.val() === '') {
				error = true
				confirmationPassword.addClass('error')
				errorMsg += '<br/>Type your confirmation password'
			} else confirmationPassword.removeClass('error')
			if (confirmationPassword.val() != loginPassword.val()) {
				error = true
				confirmationPassword.addClass('error')
				errorMsg += '<br/>Password not same'
			}
		}
		if (!error) {
			if (!isLogin) registerUser()
			else loginUser()
		} else {
			loginMsg.html(errorMsg)
			loginMsg.show()
		}
	})
	jQuery('.back', loginWindow).click(function () {
		hideWindow()
	})
	pageLogin.click(function () {
		pageLogin.addClass('active')
		pageRegister.removeClass('active')
		confirmationPasswordDiv.hide()
		loginMsg.hide()
		jQuery('#loginSbmt').html('login')
	})
	pageRegister.click(function () {
		pageLogin.removeClass('active')
		pageRegister.addClass('active')
		confirmationPasswordDiv.show()
		loginMsg.hide()
		jQuery('#loginSbmt').html('register')
	})

	checkLogin()

	function inputKeyPress() {
		if (jQuery(this).val() !== '') jQuery(this).removeClass('error')
	}

	function hideWindow() {
		loginWindow.fadeOut('fast', function () {
			loginMsg.hide()
			confirmationPassword.removeClass('error')
			loginPassword.removeClass('error')
			loginEmail.removeClass('error')
			pageLogin.click()
		})
	}

	function loginUser() {
		jQuery
			.ajax({
				type: 'POST',
				url: '/auth/login',
				data: {
					email: loginEmail.val(),
					password: loginPassword.val(),
					stayOnline: stayOnline.is(':checked'),
				},
			})
			.done(function (msg) {
				loginPassword.val('')
				if (msg.error) {
					loginMsg.html(msg.msg)
					loginMsg.show()
				} else {
					jQuery.cookie('sessionid', msg.sessionid)
					loginMsg.html(msg.msg)
					loginMsg.show()
					setTimeout(function () {
						hideWindow()
						checkLogin()
					}, 1000)
				}
			})
	}

	function checkLogin() {
		user.html('loading...')
		jQuery
			.ajax({
				type: 'GET',
				url: '/auth',
			})
			.done(function (msg) {
				if (msg.error) {
					user.html('login')
					user.unbind('click')
					user.click(function () {
						loginWindow.fadeIn('fast')
					})
				} else {
					user.html(msg.displayname)
					user.unbind('click')
					user.click(logout)
				}
			})
	}

	function logout() {
		jQuery
			.ajax({
				type: 'DELETE',
				url: '/auth',
			})
			.done(function (msg) {
				if (msg.error) {
					alert(msg.msg)
					return
				}
				user.html('login')
				user.unbind('click')
				user.click(function () {
					loginWindow.fadeIn('fast')
				})
			})
	}

	function registerUser() {
		jQuery
			.ajax({
				type: 'POST',
				url: '/auth/register',
				data: {
					email: loginEmail.val(),
					password: loginPassword.val(),
					confirmationPassword: confirmationPassword.val(),
					stayOnline: stayOnline.is(':checked'),
				},
			})
			.done(function (msg) {
				loginPassword.val('')
				confirmationPassword.val('')
				if (msg.error) {
					loginMsg.html(msg.msg)
					loginMsg.show()
				} else {
					loginMsg.html(msg.msg)
					loginMsg.show()
					setTimeout(function () {
						hideWindow()
						checkLogin()
					}, 1000)
				}
			})
	}
})

