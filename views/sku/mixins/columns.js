import {
  getEnabledTableColumn,
  getNameDescriptionTableColumn,
  getStatusTableColumn,
} from '@/utils/common/tableColumn'
import { sizestr } from '@/utils/utils'

export default {
  created () {
    this.columns = [
      getNameDescriptionTableColumn({
        vm: this,
        hideField: true,
        slotCallback: row => {
          return (
            <side-page-trigger onTrigger={ () => this.handleOpenSidepage(row) }>{ row.name }</side-page-trigger>
          )
        },
      }),
      {
        field: 'cpu_core_count',
        title: '虚拟CPU核数',
        width: 100,
        formatter: ({ cellValue }) => {
          return cellValue + '核'
        },
      },
      {
        field: 'memory_size_mb',
        title: '虚拟内存容量',
        width: 100,
        formatter: ({ cellValue }) => {
          return sizestr(cellValue, 'M', 1024)
        },
      },
      getStatusTableColumn({ statusModule: 'sku' }),
      {
        field: 'total_guest_count',
        title: '关联主机数量',
        width: 100,
      },
      getEnabledTableColumn(),
    ]
  },
}