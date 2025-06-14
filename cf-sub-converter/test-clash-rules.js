/**
 * Test script for Clash configuration with inline rules
 * 测试Clash配置生成和内联规则功能
 */

const { LocalConverter } = require('./dist/lib/converters/local-converter')
const { getRuleSet, getCacheStatus } = require('./dist/lib/services/rule-provider')

// 测试代理数据
const testProxyData = `
vmess://eyJ2IjoiMiIsInBzIjoi6aaZ6KeB6IqC54K5IiwiYWRkIjoiMTI3LjAuMC4xIiwicG9ydCI6IjEyMzQiLCJpZCI6IjI0NmFhNzk1LTA2MzctNGY0Yy04ZjY0LTJjOGZiMjRjMWJhZCIsImFpZCI6IjAiLCJzY3kiOiJhdXRvIiwibmV0Ijoid3MiLCJ0eXBlIjoibm9uZSIsImhvc3QiOiJURy5DTUxpdXNzc3MubG9zZXlvdXJpcC5jb20iLCJwYXRoIjoiLz9lZD0yNTYwIiwidGxzIjoidGxzIiwic25pIjoiVEcuQ01MaXVzc3NzLmxvc2V5b3VyaXAuY29tIiwiYWxwbiI6IiJ9
trojan://aa6ddd2f-d1cf-4a52-ba1b-2640c41a7856@218.190.230.207:41288?security=tls&sni=hk12.bilibili.com&allowInsecure=1&type=tcp&headerType=none#HK
ss://Y2hhY2hhMjAtaWV0Zi1wb2x5MTMwNToyRXRQcVc2SFlqVU5jU0dvaExmVmNFWlFkMjZmakNDUTVtaDFtSmRFTUNCdWN1VlZaOVBGMXVkclNLSG5WeDFvejU1azFLWHoyRm82anJnZDE4VzY2b3B0eVFlNGJtMWp6ZkNmQmJI@84.19.31.63:50841#DE
`

async function testClashGeneration () {
    console.log('🧪 Testing Clash configuration generation with inline rules...\n')

    try {
        // 测试规则集下载
        console.log('📥 Testing rule set download...')
        const testRuleSet = await getRuleSet('BanAD')
        console.log(`✅ Downloaded BanAD rules: ${testRuleSet.length} rules`)

        // 显示缓存状态
        const cacheStatus = getCacheStatus()
        console.log('📊 Cache status:', cacheStatus)

        // 测试Clash配置生成
        console.log('\n🔧 Generating Clash configuration...')
        const clashConfig = await LocalConverter.convert(testProxyData, 'clash')

        console.log('✅ Clash configuration generated successfully!')
        console.log(`📏 Configuration size: ${clashConfig.length} characters`)

        // 检查配置内容
        const hasRuleProviders = clashConfig.includes('rule-providers:')
        const hasInlineRules = clashConfig.includes('DOMAIN-SUFFIX,')
        const hasProxyGroups = clashConfig.includes('🚀 节点选择')

        console.log('\n📋 Configuration analysis:')
        console.log(`- Has rule-providers: ${hasRuleProviders ? '❌ (should be removed)' : '✅'}`)
        console.log(`- Has inline rules: ${hasInlineRules ? '✅' : '❌'}`)
        console.log(`- Has proxy groups: ${hasProxyGroups ? '✅' : '❌'}`)

        // 统计规则数量
        const ruleLines = clashConfig.split('\n').filter(line =>
            line.trim().startsWith('- ') &&
            (line.includes('DOMAIN') || line.includes('IP-CIDR') || line.includes('GEOIP'))
        )
        console.log(`- Total rules: ${ruleLines.length}`)

        // 保存配置文件用于检查
        const fs = require('fs')
        fs.writeFileSync('test-clash-config.yaml', clashConfig)
        console.log('\n💾 Configuration saved to test-clash-config.yaml')

        // 显示配置的前几行
        console.log('\n📄 Configuration preview:')
        const lines = clashConfig.split('\n')
        lines.slice(0, 20).forEach((line, index) => {
            console.log(`${(index + 1).toString().padStart(2, '0')}: ${line}`)
        })

        if (lines.length > 20) {
            console.log(`... (${lines.length - 20} more lines)`)
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message)
        console.error(error.stack)
    }
}

async function testRuleSetDownload () {
    console.log('\n🌐 Testing individual rule set downloads...\n')

    const testRuleSets = ['BanAD', 'GoogleCN', 'Apple', 'Microsoft', 'Telegram']

    for (const ruleSetName of testRuleSets) {
        try {
            console.log(`📥 Downloading ${ruleSetName}...`)
            const rules = await getRuleSet(ruleSetName)
            console.log(`✅ ${ruleSetName}: ${rules.length} rules`)

            // 显示前几条规则
            if (rules.length > 0) {
                console.log('   Sample rules:')
                rules.slice(0, 3).forEach(rule => {
                    console.log(`   - ${rule}`)
                })
                if (rules.length > 3) {
                    console.log(`   ... and ${rules.length - 3} more`)
                }
            }
            console.log()
        } catch (error) {
            console.error(`❌ Failed to download ${ruleSetName}:`, error.message)
        }
    }
}

// 运行测试
async function runTests () {
    console.log('🚀 Starting Clash configuration tests...\n')

    await testRuleSetDownload()
    await testClashGeneration()

    console.log('\n✨ Tests completed!')
}

runTests().catch(console.error) 