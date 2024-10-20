/**
 * Confluence图床
 *
 * @author ridup
 * @since 2021/11/29 14:07
 */

const {logPrintEnabled} = require('./constant')

module.exports = (ctx) => {
  const register = () => {
    ctx.helper.uploader.register('confluence', {
      handle,
      name: 'Confluence图床',
      config: config
    })
  }
  const logInfo = message => {
    const {log} = ctx
    if (logPrintEnabled) {
      log.warn(message)
    }
  }
  const logWarn = message => {
    const {log} = ctx
    if (logPrintEnabled) {
      log.warn(message)
    }
  }
  const logError = message => {
    const {log} = ctx
    if (logPrintEnabled) {
      log.warn(message)
    }
  }
  const handle = async function (ctx) {
    logInfo('开始上传....')
    const userConfig = ctx.getConfig('picBed.confluence')
    if (!userConfig) {
      throw new Error('Can\'t find uploader config')
    }
    const confluenceBaseUrl = userConfig.confluenceBaseUrl
    const previewBaseUrl = userConfig.previewBaseUrl || confluenceBaseUrl
    const pageId = userConfig.pageId
    const realUrl = new URL('/rest/api/content/' + pageId + '/child/attachment', confluenceBaseUrl).toString()

    try {
      const imgList = ctx.output || []
      for (const i in imgList) {
        let image = imgList[i].buffer
        if (!image && imgList[i].base64Image) {
          image = Buffer.from(imgList[i].base64Image, 'base64')
        }

        const request = buildRequest(realUrl, image, imgList[i].fileName, userConfig)

        const res = await ctx.request(request)
        logWarn(`res body: ${JSON.stringify(res.body)}`)
        if (!res.statusCode) {
          const body = res || {}
          const {results} = body || {}
          const {_links} = (results && results[0]) || {}
          const {download} = _links || {}
          logWarn(`download: ${JSON.stringify(download)}`)
          imgList[i]['imgUrl'] = new URL(download || '', previewBaseUrl).toString()
          imgList[i]['url'] = new URL(download || '', confluenceBaseUrl).toString()
          delete imgList[i].base64Image
          delete imgList[i].buffer
        } else {
          logError(`上传失败: ${res.error && res.error.message}`)
          ctx.emit('notification', {
            title: '上传失败',
            body: res.error && res.error.message
          })
        }
      }
    } catch (err) {
      logError(err)
      ctx.emit('notification', {
        title: '上传失败',
        body: err
      })
    }
  }

  /**
   * 请求构建，更多请参考<a src='https://github.com/request/request-promise-native'>Request-Promise-Native</a>
   *
   * @param url
   * @param image
   * @param fileName
   * @param userConfig
   */
  const buildRequest = (url, image, fileName, userConfig = {}) => {
    const userToken = userConfig.userToken
    logInfo(`buildRequest.userToken = ${userToken}`)
    const headers = {
      contentType: 'multipart/form-data',
      'X-Atlassian-Token': 'nocheck',
      'Authorization': `Bearer ${userToken}`
    }
    const formData = {
      file: {
        value: image,
        options: {
          filename: fileName
        }
      },
      comment: `From PicGo -${new Date().toLocaleDateString()}`
    }
    return {
      method: 'POST',
      resolveWithFullResponse: false,
      json: true,
      url: url,
      headers: headers,
      formData: formData
    }
  }

  const config = ctx => {
    let userConfig = ctx.getConfig('picBed.confluence')
    if (!userConfig) {
      userConfig = {}
    }
    return [
      {
        name: 'confluenceBaseUrl',
        type: 'input',
        default: userConfig.confluenceBaseUrl,
        required: true,
        message: 'https://confluence.com',
        alias: 'Confluence网站地址'
      },
      {
        name: 'previewBaseUrl',
        type: 'input',
        default: userConfig.previewBaseUrl,
        required: false,
        message: 'https://confluence.com',
        alias: '预览图片网站地址'
      },
      {
        name: 'userToken',
        type: 'input',
        default: userConfig.userToken,
        required: true,
        message: 'User Token',
        alias: '个人访问令牌'
      },
      {
        name: 'pageId',
        type: 'input',
        default: userConfig.pageId,
        required: true,
        message: 'Page Id',
        alias: '页面编号'
      }
    ]
  }
  return {
    uploader: 'confluence',
    transformer: 'confluence',
    config: config,
    register
  }
}
