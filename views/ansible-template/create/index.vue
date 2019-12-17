<template>
  <div>
    <page-header :title="id ? '更新模版' : '创建模版'" />
    <a-form class="mt-3" :form="form" v-bind="formItemLayout">
      <a-form-item label="名称">
        <a-input :disabled="!!id" v-decorator="decorators.name" :placeholder="$t('validator.serverName')" />
      </a-form-item>
      <a-form-item label="主机">
        <code-mirror v-decorator="decorators.hosts" @input="(v) => handleCodeInput('hosts', v)" :options="cmOptions" style="line-height: 25px" view-height="120px" :is-scroll="true" />
      </a-form-item>
      <!-- 文件上传 -->
      <upload :defaultFiles="defaultFiles" />
      <a-form-item label="playbook" required>
        <code-mirror v-decorator="decorators.playbook" @input="(v) => handleCodeInput('playbook', v)" :options="cmOptions" style="line-height: 25px"  view-height="300px" :is-scroll="true" />
      </a-form-item>
      <a-form-item label="立即执行" required>
        <a-switch :defaultChecked="decorators.start[1].initialValue" v-decorator="decorators.start" checkedChildren="开" unCheckedChildren="关" />
        <span slot="extra">创建成功后，会立即执行一次</span>
      </a-form-item>
      <a-form-item label="时间间隔" required>
        <a-input-number v-decorator="decorators.hour" :min="1" />
        <span slot="extra">每隔多长时间，执行一次，单位是小时</span>
      </a-form-item>
    </a-form>
    <page-footer>
      <a-button type="primary" @click="handleConfirm" :loading="loading" class="ml-3">确认</a-button>
    </page-footer>
  </div>
</template>
<script>
// import * as R from 'ramda'
import { CreateServerForm } from '@Compute/constants'
import Upload from './components/Upload'
export default {
  name: 'AnsibleTemplateCreate',
  components: {
    Upload,
  },
  data () {
    return {
      id: undefined,
      loading: false,
      retData: {},
      form: this.$form.createForm(this, { onFieldsChange: this.onFieldsChange }),
      cmOptions: {
        tabSize: 2,
        styleActiveLine: true,
        lineNumbers: true,
        line: true,
        mode: 'text/x-yaml',
        theme: 'material',
        autofocus: true,
      },
      formItemLayout: {
        wrapperCol: { span: CreateServerForm.wrapperCol },
        labelCol: { span: CreateServerForm.labelCol },
      },
    }
  },
  computed: {
    defaultFiles () {
      const { playbook = {} } = this.retData
      return playbook.files || []
    },
    decorators () {
      const { name, playbook = {}, start, hour } = this.retData
      const { inventory, modules } = playbook
      let hostStr = ''
      if (inventory && inventory.hosts && inventory.hosts.length > 0) {
        const _arr = []
        const { name, vars } = playbook.inventory.hosts[0]
        _arr.push(name)
        if (vars) {
          Object.keys(vars).forEach(k => {
            _arr.push(`${k}=${vars[k]}`)
          })
        }
        hostStr = _arr.join(' ')
      }
      let moduleStr = ''
      if (modules && modules.length > 0) {
        playbook.modules.forEach((item, i) => {
          item['args'] = item.args || []
          const { name, args } = item
          moduleStr += `${i ? '\r' : ''}${name} ${args.join(' ')}`
        })
      }
      return {
        name: [
          'name',
          {
            initialValue: name,
            validateTrigger: 'blur',
            validateFirst: true,
            rules: [
              { required: true, message: '请输入名称' },
              { validator: this.$validate('serverName') },
            ],
          },
        ],
        hosts: [
          'hosts',
          {
            initialValue: hostStr,
            rules: [
              { required: true, message: '请输入主机' },
            ],
          },
        ],
        playbook: [
          'playbook',
          {
            initialValue: moduleStr,
            rules: [
              { required: true, message: '请输入playbook' },
            ],
          },
        ],
        start: [
          'start',
          {
            initialValue: start === undefined ? true : start,
          },
        ],
        hour: [
          'hour',
          {
            initialValue: hour || 24,
          },
        ],
      }
    },
  },
  provide () {
    return {
      form: this.form,
    }
  },
  created () {
    this.manager = new this.$Manager('devtool_templates')
    const { id } = this.$route.query
    this.id = this.$route.query.id
    if (id) {
      this.queryInfo(id)
    }
  },
  methods: {
    handleCodeInput (key, value) {
      this.form.setFieldsValue({
        [key]: value,
      }, () => {
        this.form.validateFields([key])
      })
    },
    validateForm () {
      return new Promise((resolve, reject) => {
        this.form.validateFields((err, values) => {
          if (err || document.querySelector('.ant-form .error-color')) {
            reject(err)
            return false
          }
          const { name, hour, start, hosts, files } = values
          const params = { name, hour, start, enabled: true }
          const playbook = {
            files,
            inventory: {
              hosts: [],
            },
            modules: [],
          }
          const hostItem = {
            vars: {},
          }
          hosts.split(' ').forEach(item => {
            item = item.replace("'", '')
            if (!item || item === '--host' || item === '\\') return false
            const arr = item.split('=')
            if (arr.length === 2) {
              const [key, value] = arr
              hostItem['vars'][key] = value
            } else {
              hostItem['name'] = item
            }
          })
          playbook['inventory']['hosts'].push(hostItem)
          if (values.playbook) {
            const modules = []
            const modeItems = values.playbook.replace(/[\r\n]/g, '<br/>').split('<br/>')
            modeItems.forEach(item => {
              const _arr = []
              const moduleItem = {}
              item.split(' ').forEach(subItem => {
                subItem = subItem.replace("'", '')
                if (subItem && subItem !== '\\') {
                  _arr.push(subItem)
                }
              })
              if (_arr && _arr.length > 0) {
                moduleItem['name'] = _arr.shift()
                moduleItem.args = _arr
                modules.push(moduleItem)
              }
            })
            playbook['modules'] = modules
          }
          params['playbook'] = playbook
          resolve(params)
        })
      })
    },
    async handleConfirm () {
      this.loading = true
      try {
        const values = await this.validateForm()
        if (this.id) {
          await this.manager.update({
            id: this.id,
            data: values,
          })
        } else {
          await this.manager.create({
            data: values,
          })
        }
        this.$router.push('/ansibletemplate')
      } catch (err) {
        throw err
      } finally {
        this.loading = false
      }
    },
    async queryInfo (id) {
      try {
        const { data } = await this.manager.get({ id })
        this.retData = data
      } catch (err) {
        throw err
      }
    },
  },
}
</script>
