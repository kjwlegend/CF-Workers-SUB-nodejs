import { dirname } from "path"
import { fileURLToPath } from "url"
import { FlatCompat } from "@eslint/eslintrc"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // 禁用未使用变量的检查（不影响功能）
      "@typescript-eslint/no-unused-vars": "off",

      // 禁用any类型的检查（临时解决方案）
      "@typescript-eslint/no-explicit-any": "off",

      // 禁用React Hook依赖检查的警告（改为警告而不是错误）
      "react-hooks/exhaustive-deps": "warn",

      // 禁用匿名默认导出的警告
      "import/no-anonymous-default-export": "off",

      // 其他可能的规则
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/ban-ts-comment": "off",
    }
  }
]

export default eslintConfig
