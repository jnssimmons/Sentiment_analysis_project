# Sentiment_analysis_project
Experimenting with cognitive analysis with the Microsoft team.

## First-time setup with Azure Function
1. Connect Azure Function to this repository: In Azure, go to Platform Features > Deployment options and set up deployment via GitHub.
2. To manually install node modules: In Azure, go to Platform Features > Console. Type `cd TimerTriggerJS1` and press Enter. Then, type `npm install` and press Enter. It may take several minutes for everything to install.
3. To set up environment variables: In Azure, go to Platform Features > Application Settings > App Settings and add the following key-value pairs:
  - `twitterconsumerkey` (Twitter consumer key)
  - `twitterconsumersecret` (Twitter consumer secret)
  - `twitteraccesstoken` (Twitter access token)
  - `twitteraccesstokensecret` (Twitter access token secret)
  - `textkey` (Cognitive Services Text Analytics key)
  - `azurestoragename` (Azure Table Storage account name)
  - `azurestoragekey` (Azure Table Storage key)
4. Under the Integrate tab, set function to run per a schedule of your choosing. 
