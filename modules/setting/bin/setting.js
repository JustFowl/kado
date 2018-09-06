#!/use/bin/env node
'use strict';
/**
 * Kado - Awesome module system for Enterprise Grade applications.
 * Copyright © 2015-2018 NULLIVEX LLC. All rights reserved.
 * Kado <support@kado.org>
 *
 * This file is part of Kado.
 *
 * Kado is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Kado is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Kado.  If not, see <https://www.gnu.org/licenses/>.
 */
const K = require('../../../index')
const program = require('commander')
const fs = require('fs')
const mkdirp = require('mkdirp-then')
const Mustache = require('mustache')
const path = require('path')
const readdir = require('recursive-readdir')
const rmdir = require('rmdir-promise')

const log = K.log

//make some promises
K.bluebird.promisifyAll(fs)

program.version(K.config.version)


program.command('dbsetup')
  .option('--dbshost <string>','Set the sequelize database host')
  .option('--dbsport <string>','Set the sequelize database port')
  .option('--dbsuser <string>','Set the sequelize database user')
  .option('--dbspassword <string>','Set the sequelize database password')
  .action((cmd) => {
    K.configure({
      db: {
        sequelize: {
          load: true,
          enabled: true,
          host: cmd.dbshost || 'localhost',
          port: cmd.dbsport || 3306,
          user: cmd.dbsuser || 'kado',
          password: cmd.dbspassword || 'kado'
        }
      }
    })
    log.info('Beginning database setup')
    log.info('Connecting to database')
    K.init()
      .then(() => {
        log.info('Connecting to sequelize')
        return K.db.sequelize.doConnect({sync: true})
      })
      .then(() => {
        log.info('Database connected, initializing...')
      })
      .catch((err) => {
        log.error(err)
        process.exit(1)
      })
      .finally(() => {
        log.info('Database setup complete, run this again any time')
        K.db.sequelize.close()
        process.exit()
      })
  })


program.command('generate')
  .option('--app <string>','Name of this application')
  .option('--modconf <string>','Module config JSON file')
  .option('--stomp','Remove the destination directory if it exists, DANGEROUS!')
  .action((cmd) => {
    let folder = process.cwd()
    let modconfFile = folder + '/' + cmd.modconf
    if(!modconfFile || !fs.existsSync(modconfFile)){
      log.error('Must have module configuration JSON file, exiting')
      process.exit(1)
    }
    let modconf = require(modconfFile)
    let moduleFolder = path.resolve(folder + '/modules/' + modconf.moduleName)
    let templateFolder = path.resolve(__dirname + '/../helpers/_template')
    let fileCount = 0
    if(!cmd.app) cmd.app = 'myapp'
    K.bluebird.try(() => {
      let folderExists = fs.existsSync(moduleFolder)
      if(folderExists && !cmd.stomp){
        log.error('Module folder already exits')
        process.exit(1)
      } else if(folderExists && cmd.stomp){
        log.info('Removing existing module folder')
        return rmdir(moduleFolder)
      } else {
        log.info('Creating module folder')
      }
    })
      .then(() => {
        return readdir(templateFolder)
      })
      .each((file) => {
        let relativePath = file.replace(templateFolder,'')
        let template = fs.readFileSync(file,{encoding: 'utf-8'})
        log.info('Rendering ' + modconf.moduleName + relativePath)
        let result = Mustache.render(template,modconf)
        let modulePath = path.resolve(moduleFolder + '/' + relativePath)
        return mkdirp(path.dirname(modulePath))
          .then(() => {
            return fs.writeFileAsync(modulePath,result)
          })
          .then(() => {
            fileCount++
          })
      })
      .then(() => {
        log.info('Created ' + fileCount + ' new files!')
        log.info('Module generation complete! Please check: ' + moduleFolder)
        process.exit()
      })
  })


program.command('bootstrap')
  .option('--app <string>','Name of this application')
  .option('--enable-admin','Enable the admin interface')
  .option('--enable-all','Enable all modules and interfaces')
  .option('--enable-api','Enable api interface')
  .option('--enable-main','Enable main interface')
  .option('--enable-blog','Enable blog module')
  .option('--enable-setting','Enable setting module')
  .option('--enable-staff','Enable staff module')
  .option('--dbsequelize','Enable sequelize connector')
  .option('--dbshost <string>','Set the sequelize database host')
  .option('--dbsport <string>','Set the sequelize database port')
  .option('--dbsuser <string>','Set the sequelize database user')
  .option('--dbspassword <string>','Set the sequelize database password')
  .action((cmd) => {
    let folder = process.cwd()
    let appFile = path.resolve(folder + '/app.js')
    if(fs.existsSync(appFile)){
      console.log('ERROR app file already exits')
      process.exit(1)
    }
    if(!cmd.app) cmd.app = 'myapp'
    if(cmd.enableAll){
      cmd.enableAdmin = true
      cmd.enableApi = true
      cmd.enableMain = true
      cmd.enableBlog = true
      cmd.enableSetting = true
      cmd.enableStaff = true
    }
    if(cmd.enableBlog || cmd.enableSetting || cmd.enableStaff){
      cmd.enableAdmin = true
    }
    if(cmd.enableBlog) cmd.enableMain = true
    let dbConfig = ''
    let enableDB = (name,flag) => {
      if(flag){
        let isFirst = false
        if(!dbConfig){
          dbConfig = ',\n  db: {\n'
          isFirst = true
        }
        let dbExtra = ''
        if(cmd.dbshost){
          dbExtra += '      host: \'' + cmd.dbshost + '\',\n'
        }
        if(cmd.dbsport){
          dbExtra += '      port: ' + cmd.dbsport + ',\n'
        }
        if(cmd.dbsuser){
          dbExtra += '      user: \'' + cmd.dbsuser + '\',\n'
        }
        if(cmd.dbspassword){
          dbExtra += '      password: \'' + cmd.dbspassword + '\',\n'
        }
        dbConfig = dbConfig +
          (isFirst ? '' : ',\n') + '    ' + name +
          ': {\n      enabled: true,\n' + (dbExtra || '') + '    }\n  }'
      }
    }
    enableDB('sequelize',cmd.dbsequelize)
    let interfaceConfig = ''
    let enableInterface = (name,flag) => {
      if(flag){
        let isFirst = false
        if(!interfaceConfig){
          interfaceConfig = ',\n  interface: {\n'
          isFirst = true
        }
        interfaceConfig = interfaceConfig +
          (isFirst ? '' : ',\n') + '    ' + name + ': { enabled: true }'
      }
    }
    enableInterface('admin',cmd.enableAdmin)
    enableInterface('api',cmd.enableApi)
    enableInterface('main',cmd.enableMain)
    if(interfaceConfig) interfaceConfig = interfaceConfig + '\n  }'
    let moduleConfig = ''
    let enableModule = (name,flag) => {
      if(flag){
        let isFirst = false
        if(!moduleConfig){
          moduleConfig = ',\n  module: {\n'
          isFirst = true
        }
        moduleConfig = moduleConfig +
          (isFirst ? '' : ',\n') + '    ' + name + ': { enabled: true }'
      }
    }
    enableModule('blog',cmd.enableBlog)
    enableModule('setting',cmd.enableSetting)
    enableModule('staff',cmd.enableStaff)
    if(moduleConfig) moduleConfig = moduleConfig + '\n  }\n'
    let appRequire = '\'kado\''
    if(!process.argv[1].match(/node_modules/i)) appRequire = '\'./index\''
    let appData = '\'use strict\';\n' +
      'let K = require(' + appRequire + ')\n' +
      'K.configure({\n' +
      '  root: __dirname' + dbConfig + interfaceConfig + moduleConfig +
      '})\n' +
      'K.go(\'' + cmd.app + '\')\n'
    fs.writeFileSync(appFile,appData)
    log.info('Application is ready!')
    process.exit()
  })

program.parse(process.argv)
