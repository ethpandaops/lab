import { ArrowRight, Share2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardBody } from '@/components/common/Card';

interface CallToActionProps {
  title: string;
  description: string;
  buttonText: string;
  buttonLink: string;
}

export const CallToAction = ({ title, description, buttonText, buttonLink }: CallToActionProps) => {
  return (
    <Card className="relative overflow-hidden">
      <CardBody>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-accent/10 p-2 sm:p-2.5 flex items-center justify-center">
            <Share2 className="h-5 w-5 sm:h-6 sm:w-6 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg sm:text-xl font-bold title-gradient">{title}</h3>
            <p className="mt-1 text-sm sm:text-base text-text-primary">{description}</p>
          </div>
          <Link
            to={buttonLink}
            className="w-full sm:w-auto flex-shrink-0 inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-text-primary bg-accent/10 hover:bg-accent/20 border border-accent/25 transition-all hover:scale-105"
          >
            {buttonText}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </CardBody>
    </Card>
  );
};
