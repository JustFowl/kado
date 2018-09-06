'use strict';
const K = require('../../../index')
const sequelize = K.db.sequelize

const {{moduleModelName}} = sequelize.models.{{moduleModelName}}


/**
 * List blogs
 * @param {object} req
 * @param {object} res
 */
exports.list = (req,res) => {
  if(!req.query.length){
    res.render(res.locals._view.get('{{moduleName}}/list'))
  } else {
    K.datatable({{moduleModelName}},req.query)
      .then((result) => {
        res.json(result)
      })
      .catch((err) => {
        res.json({error: err.message})
      })
  }
}


/**
 * Create entry
 * @param {object} req
 * @param {object} res
 */
exports.create = (req,res) => {
  res.render(res.locals._view.get('{{moduleName}}/create'))
}


/**
 * Edit
 * @param {object} req
 * @param {object} res
 */
exports.edit = (req,res) => {
  {{moduleModelName}}.findOne({where: {id: req.query.id}})
    .then((result) => {
      if(!result) throw new Error(K._l.{{moduleName}}.entry_not_found)
      res.render(res.locals._view.get('{{moduleName}}/edit'),{item: result})
    })
    .catch((err) => {
      res.render('error',{error: err})
    })
}


/**
 * Save
 * @param {object} req
 * @param {object} res
 */
exports.save = (req,res) => {
  let data = req.body
  let json = K.isClientJSON((req)
  {{moduleModelName}}.findOne({where: {id: data.id}})
    .then((result) => {
      if(!result) result = {{moduleModelName}}.build()
      {{#moduleFields}}
      if(data.{{fieldName}}) result.{{fieldName}} = data.{{fieldName}}
      {{/moduleFields}}
      if('undefined' === typeof data.active) result.active = false
      if(data.active) result.active = true
      return result.save()
    })
    .then((result) => {
      if(json){
        res.json({item: result.dataValues})
      } else {
        req.flash('success',{
          message: K._l.{{moduleName}}.entry + ' ' + (isNew ? K._l.created : K._l.saved),
          href: '/{{moduleName}}/edit?id=' + result.id,
          name: result.id
        })
        res.redirect('/{{moduleName}}/list')
      }
    })
    .catch((err) => {
      res.render('error',{error: err})
    })
}


/**
 * Process removals
 * @param {object} req
 * @param {object} res
 */
exports.remove = (req,res) => {
  let json = K.isClientJSON(req)
  if(req.query.id) req.body.remove = req.query.id.split(',')
  if(!(req.body.remove instanceof Array)) req.body.remove = [req.body.remove]
  K.modelRemoveById({{moduleModelName}},req.body.remove)
    .then(() => {
      if(json){
        res.json({success: K._l.{{moduleName}}.entry_removed})
      } else {
        req.flash('success',K._l.{{moduleName}}.entry_removed)
        res.redirect('/{{moduleName}}/list')
      }
    })
    .catch((err) => {
      if(json){
        res.json({error: err.message || K._l.{{moduleName}}.removal_error})
      } else {
        res.render(res.locals._view.get('error'),{error: err.message})
      }
    })
}
