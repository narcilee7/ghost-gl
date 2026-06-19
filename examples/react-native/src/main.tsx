import { StatusBar } from 'expo-status-bar'
import { StyleSheet, View } from 'react-native'
import { GhostGridExample } from './components/GhostGridExample'

export default function App() {
  return (
    <View style={styles.container}>
      <GhostGridExample />
      <StatusBar style="auto" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
})
