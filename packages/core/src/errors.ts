/**
 * Custom error classes for webview-rpc
 * @module errors
 */

/**
 * Error thrown when a function is not yet implemented (used during TDD)
 */
export class NotImplementedError extends Error {
	constructor(message = 'Not implemented') {
		super(message)
		this.name = 'NotImplementedError'
		Object.setPrototypeOf(this, NotImplementedError.prototype)
	}
}

/**
 * Base error class for WebView RPC errors
 */
export class WebViewRPCError extends Error {
	code: string

	constructor(message: string, code: string) {
		super(message)
		this.name = 'WebViewRPCError'
		this.code = code
		Object.setPrototypeOf(this, WebViewRPCError.prototype)
	}
}

/**
 * Error thrown when an RPC request times out
 */
export class WebViewRPCTimeoutError extends WebViewRPCError {
	timeout: number

	constructor(message: string, timeout: number) {
		super(message, 'TIMEOUT')
		this.name = 'WebViewRPCTimeoutError'
		this.timeout = timeout
		Object.setPrototypeOf(this, WebViewRPCTimeoutError.prototype)
	}
}
