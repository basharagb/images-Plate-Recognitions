# OpenAI API Setup Guide

## Current Status: Demo Mode Active

Your Car Plate Recognition system is currently running in **Demo Mode** because the OpenAI API key has exceeded its quota. The system will return demo results (like "ABC123" plate number) until you add credits to your OpenAI account.

## How to Fix the API Key Issue

### Step 1: Check Your OpenAI Account
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign in to your account
3. Navigate to **Billing** → **Usage**
4. Check your current usage and available credits

### Step 2: Add Credits to Your Account
1. Go to **Billing** → **Payment methods**
2. Add a payment method if you haven't already
3. Go to **Billing** → **Credits**
4. Purchase credits (minimum $5 recommended)

### Step 3: Verify API Key Permissions
1. Go to **API Keys** in your OpenAI dashboard
2. Make sure your API key has access to:
   - **GPT-4 Vision** (gpt-4-vision-preview or gpt-4o-mini)
   - **Image processing capabilities**

### Step 4: Update Your API Key (if needed)
If you need to generate a new API key:

1. Go to **API Keys** in OpenAI dashboard
2. Click **Create new secret key**
3. Copy the new key
4. Update your `.env` file:

```bash
# In backend/.env
OPENAI_API_KEY=sk-proj-your-new-api-key-here
```

5. Restart the backend server:
```bash
cd backend
npm run dev
```

## Current Demo Mode Behavior

While in demo mode, the system will:
- ✅ Accept image uploads
- ✅ Show processing animation
- ✅ Return demo car data: `ABC123`, `white`, `sedan`
- ✅ Display results in the dashboard
- ⚠️ Not save to database (demo data only)
- ⚠️ Show same result for all images

## Testing Real Recognition

Once you've added credits and updated your API key:

1. Upload a clear car image with visible license plate
2. Click "Recognize Cars"
3. The system will use real AI vision to detect:
   - Actual license plate numbers (letters + numbers)
   - Real car colors
   - Actual vehicle types
   - Multiple cars per image

## Recommended OpenAI Plan

For production use:
- **Pay-as-you-go**: $0.01 per 1K tokens (recommended)
- **Monthly budget**: Set a reasonable limit ($10-50/month)
- **Model**: gpt-4o-mini (cost-effective for vision tasks)

## Cost Estimation

Approximate costs per image:
- **Small image (800x600)**: ~$0.002-0.005
- **Large image (1920x1080)**: ~$0.005-0.01
- **100 images/day**: ~$0.50-1.00/day

## Troubleshooting

### Error: "429 Quota Exceeded"
- Add credits to your OpenAI account
- Wait for billing cycle to reset (if on free tier)

### Error: "Invalid API Key"
- Check if key is correctly set in `.env`
- Regenerate key in OpenAI dashboard
- Ensure no extra spaces in the key

### Error: "Model not found"
- Verify your account has access to GPT-4 Vision
- Try switching to `gpt-4o-mini` model

## Support

If you continue having issues:
1. Check OpenAI status page: https://status.openai.com/
2. Contact OpenAI support: https://help.openai.com/
3. Review OpenAI documentation: https://platform.openai.com/docs/

---

**Note**: The demo mode ensures your application continues working even when the API has issues. Users can still test the interface and see how the system works.
